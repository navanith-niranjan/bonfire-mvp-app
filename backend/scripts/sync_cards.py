"""
Script to sync Pokemon cards from pokemontcg.io API to Supabase.
Run once for initial sync, then schedule for updates.

Usage:
    python scripts/sync_cards.py
"""
import asyncio
import aiohttp
import os
import sys
from typing import Dict, Any, Optional
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from sqlalchemy.pool import NullPool
from app.models import PokemonCard
from app.config import settings
from datetime import datetime

# Pokemon TCG API configuration (from settings)
POKEMON_TCG_API_URL = settings.POKEMON_TCG_API_URL
POKEMON_TCG_API_KEY = settings.POKEMON_TCG_API_KEY

# Database setup
engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def detect_language(card_data: Dict[str, Any]) -> str:
    """Detect language from API response or card data."""
    # First, check if API provides language field directly
    if 'language' in card_data:
        lang = card_data.get('language', '').lower()
        if lang in ['ja', 'japanese', 'jp']:
            return "ja"
        elif lang in ['en', 'english']:
            return "en"
    
    # Fallback: detect from set name or card name
    set_name = card_data.get("set", {}).get("name", "")
    name = card_data.get("name", "")
    
    # Check if name has Japanese characters
    if any('\u3040' <= char <= '\u309F' or '\u30A0' <= char <= '\u30FF' for char in name):
        return "ja"
    
    # Check set name for Japanese indicators
    japanese_indicators = ["拡張パック", "スターター", "ポケモンカード"]
    if any(indicator in set_name for indicator in japanese_indicators):
        return "ja"
    
    return "en"


def extract_price(card_data: Dict[str, Any]) -> Dict[str, Optional[float]]:
    """Extract price data from TCGPlayer API response."""
    prices = {
        'market_price': None,
        'price_source': None,
    }
    
    tcgplayer = card_data.get('tcgplayer', {})
    if not tcgplayer:
        return prices
    
    price_data = tcgplayer.get('prices', {})
    if not price_data:
        return prices
    
    # Try different price types in order of preference
    price_types = [
        'holofoil',
        'reverseHolofoil',
        'unlimitedHolofoil',
        '1stEditionHolofoil',
        'normal'
    ]
    
    for price_type in price_types:
        if price_type in price_data:
            price_info = price_data[price_type]
            if price_info.get('market'):
                prices['market_price'] = float(price_info['market'])
                prices['price_source'] = 'tcgplayer'
                break
    
    return prices


def transform_card(card_data: Dict[str, Any]) -> Dict[str, Any]:
    """Transform API response to database model."""
    language = detect_language(card_data)
    prices = extract_price(card_data)
    
    return {
        'external_id': card_data['id'],
        'name': card_data.get('name', ''),
        'set_name': card_data.get('set', {}).get('name'),
        'set_id': card_data.get('set', {}).get('id'),
        'number': card_data.get('number'),
        'rarity': card_data.get('rarity'),
        'supertype': card_data.get('supertype'),
        'subtypes': card_data.get('subtypes', []),
        'image_small': card_data.get('images', {}).get('small'),
        'image_large': card_data.get('images', {}).get('large'),
        'language': language,
        'name_jp': card_data.get('name_jp'),  # If API provides it
        'market_price': prices['market_price'],
        'price_source': prices['price_source'],
        'price_updated_at': datetime.utcnow() if prices['market_price'] else None,
        'tcgplayer_data': card_data.get('tcgplayer'),
        'raw_data': card_data,
    }


async def fetch_cards_page(
    session: aiohttp.ClientSession,
    page: int = 1,
    page_size: int = 250,
    max_retries: int = 5
) -> Dict[str, Any]:
    """Fetch a single page of cards from API with retry logic for 504 errors."""
    headers = {}
    if POKEMON_TCG_API_KEY:
        headers['X-Api-Key'] = POKEMON_TCG_API_KEY
    
    # Ensure URL ends with /v2/cards (API v2 format)
    base_url = POKEMON_TCG_API_URL.rstrip('/')
    if not base_url.endswith('/v2'):
        # If base URL doesn't include /v2, add it
        url = f"{base_url}/v2/cards"
    else:
        url = f"{base_url}/cards"
    
    # Build query parameters
    params = {
        'page': page,
        'pageSize': page_size,
    }
    
    # Add select parameter if we want to limit fields (optional, can help with performance)
    # Note: Removing select for now to ensure we get all data needed for language detection
    # The API supports select, but let's fetch all fields to be safe
    # 'select': 'id,name,images,set,number,rarity,subtypes,supertype,tcgplayer,language'
    
    for attempt in range(max_retries):
        try:
            async with session.get(url, headers=headers, params=params, timeout=aiohttp.ClientTimeout(total=60)) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 504:
                    # Gateway timeout - retry with exponential backoff
                    if attempt < max_retries - 1:
                        wait_time = (2 ** attempt) * 3  # 3s, 6s, 12s, 24s, 48s
                        print(f"⏳ 504 timeout on page {page}, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        text = await response.text()
                        raise Exception(f"API error: {response.status} - {text[:100]}")
                elif response.status == 404:
                    # 404 might be rate limiting or transient issue - retry with delay
                    text = await response.text()
                    if attempt < max_retries - 1:
                        # For pages > 1, 404 might be rate limiting - wait longer
                        wait_time = (2 ** attempt) * 5  # 5s, 10s, 20s, 40s, 80s
                        print(f"⏳ 404 on page {page} (might be rate limiting), retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        # Final attempt failed - this might be a real 404 (past last page)
                        full_url = f"{url}?page={page}&pageSize={page_size}"
                        error_msg = f"API error: 404 - Page not found. URL: {full_url}"
                        if text:
                            error_msg += f" Response: {text[:200]}"
                        print(f"🔍 Debug: Attempted URL: {full_url}")
                        raise Exception(error_msg)
                elif response.status == 429:
                    # Rate limit - wait longer before retry
                    if attempt < max_retries - 1:
                        wait_time = (2 ** attempt) * 10  # 10s, 20s, 40s, 80s, 160s
                        print(f"⏳ Rate limit (429) on page {page}, waiting {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        text = await response.text()
                        raise Exception(f"Rate limit exceeded after {max_retries} attempts: {text[:100]}")
                else:
                    text = await response.text()
                    raise Exception(f"API error: {response.status} - {text[:100]}")
        except aiohttp.ClientError as e:
            # Network errors - retry
            if attempt < max_retries - 1:
                wait_time = (2 ** attempt) * 3
                print(f"⏳ Network error on page {page}, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(wait_time)
                continue
            else:
                raise Exception(f"Network error after {max_retries} attempts: {e}")
        except asyncio.TimeoutError:
            # Timeout errors - retry
            if attempt < max_retries - 1:
                wait_time = (2 ** attempt) * 3
                print(f"⏳ Timeout on page {page}, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(wait_time)
                continue
            else:
                raise Exception(f"Timeout after {max_retries} attempts")
    
    raise Exception(f"Failed to fetch page {page} after {max_retries} attempts")


async def upsert_card(db_session: AsyncSession, card_data: Dict[str, Any]) -> None:
    """Insert or update a card in the database."""
    # Check if card exists
    result = await db_session.execute(
        select(PokemonCard).where(PokemonCard.external_id == card_data['external_id'])
    )
    existing_card = result.scalar_one_or_none()
    
    if existing_card:
        # Update existing card
        for key, value in card_data.items():
            setattr(existing_card, key, value)
        existing_card.updated_at = datetime.utcnow()
    else:
        # Insert new card
        card = PokemonCard(**card_data)
        db_session.add(card)


async def test_api_connection(http_session: aiohttp.ClientSession) -> bool:
    """Test if the API endpoint is accessible."""
    base_url = POKEMON_TCG_API_URL.rstrip('/')
    if not base_url.endswith('/v2'):
        url = f"{base_url}/v2/cards"
    else:
        url = f"{base_url}/cards"
    
    headers = {}
    if POKEMON_TCG_API_KEY:
        headers['X-Api-Key'] = POKEMON_TCG_API_KEY
    
    try:
        # Test with a simple request (page 1, small page size)
        # Try without q parameter first (it's optional according to docs)
        test_url = f"{url}?page=1&pageSize=1"
        print(f"🧪 Testing API connection: {test_url}")
        async with http_session.get(test_url, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as response:
            if response.status == 200:
                data = await response.json()
                print(f"✅ API connection successful! Total cards available: {data.get('totalCount', 'unknown')}")
                return True
            elif response.status == 404:
                # Try with an empty q parameter
                test_url_with_q = f"{url}?q=*&page=1&pageSize=1"
                print(f"🧪 Retrying with q parameter: {test_url_with_q}")
                async with http_session.get(test_url_with_q, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as retry_response:
                    if retry_response.status == 200:
                        data = await retry_response.json()
                        print(f"✅ API connection successful (with q parameter)! Total cards: {data.get('totalCount', 'unknown')}")
                        return True
                    else:
                        text = await retry_response.text()
                        print(f"❌ API test failed: Status {retry_response.status}")
                        print(f"   Response: {text[:500]}")
                        print(f"   💡 Possible issues:")
                        print(f"      - API endpoint may have changed")
                        print(f"      - API key may be invalid or expired")
                        print(f"      - Check https://dev.pokemontcg.io to verify your API key")
                        return False
            else:
                text = await response.text()
                print(f"❌ API test failed: Status {response.status}")
                print(f"   Response: {text[:500]}")
                if response.status == 401:
                    print(f"   💡 Authentication failed - check your API key")
                elif response.status == 429:
                    print(f"   💡 Rate limit exceeded - wait and try again later")
                return False
    except aiohttp.ClientError as e:
        print(f"❌ API test network error: {e}")
        print(f"   💡 Check your internet connection and firewall settings")
        return False
    except Exception as e:
        print(f"❌ API test error: {e}")
        return False


async def sync_all_cards():
    """Main sync function - fetches all cards and syncs to database."""
    print("🔥 Starting Pokemon card sync...")
    
    page_size = 250  # Cards per page
    max_retry_rounds = 5  # Maximum number of retry rounds for failed pages
    
    async with aiohttp.ClientSession() as http_session:
        # Test API connection first
        print(f"🔗 API URL: {POKEMON_TCG_API_URL}")
        print(f"🔑 API Key: {'Set (ending in ...' + POKEMON_TCG_API_KEY[-4:] + ')' if POKEMON_TCG_API_KEY else 'Not set'}")
        if not await test_api_connection(http_session):
            print("\n❌ Cannot connect to Pokemon TCG API. Please check:")
            print("   1. POKEMON_TCG_API_URL is correct (should be: https://api.pokemontcg.io/v2)")
            print("   2. POKEMON_TCG_API_KEY is valid and active")
            print("      - Verify at https://dev.pokemontcg.io")
            print("      - API keys may expire or be revoked")
            print("   3. Your internet connection is working")
            print("   4. The API service is operational (check https://pokemontcg.io)")
            print("\n💡 If the API key is invalid, get a new one at: https://dev.pokemontcg.io")
            return
        
        async with async_session() as db_session:
            # Step 1: Get total count from first page
            print("\n📊 Fetching first page to get total count...")
            total_count = 0
            try:
                response = await fetch_cards_page(http_session, page=1, page_size=page_size)
                total_count = response.get('totalCount', 0)
                
                if total_count == 0:
                    print("⚠️  Could not determine total count. Will sync until no more pages.")
                    max_pages = None
                else:
                    max_pages = (total_count + page_size - 1) // page_size
                    print(f"📊 Found {total_count:,} total cards across {max_pages} pages")
            except Exception as e:
                print(f"❌ Error fetching first page: {e}")
                print(f"💡 Check that POKEMON_TCG_API_URL is set correctly (should be: https://api.pokemontcg.io/v2)")
                print("⚠️  Will attempt to sync pages sequentially until no more data...")
                max_pages = None
                total_count = 0
            
            # Step 2: Sync all pages systematically
            total_synced = 0
            failed_pages = set()  # Use set to avoid duplicates
            successful_pages = set()
            
            # Determine page range to fetch
            if max_pages:
                pages_to_fetch = list(range(1, max_pages + 1))
                print(f"📄 Will attempt to fetch {len(pages_to_fetch)} pages...")
            else:
                # If we don't know total, fetch until we get empty pages
                pages_to_fetch = []
                page = 1
                consecutive_empty = 0
                while consecutive_empty < 3:  # Stop after 3 consecutive empty pages
                    pages_to_fetch.append(page)
                    page += 1
                    if page > 500:  # Safety limit
                        break
            
            # First pass: try to sync all pages
            print(f"\n📥 First pass: Fetching {len(pages_to_fetch)} pages...")
            for page in pages_to_fetch:
                try:
                    print(f"📄 Fetching page {page}/{len(pages_to_fetch)}...")
                    response = await fetch_cards_page(http_session, page=page, page_size=page_size)
                    
                    cards = response.get('data', [])
                    
                    if not cards:
                        print(f"⚠️  Page {page} returned no cards")
                        successful_pages.add(page)  # Mark as "successful" (empty is valid)
                        continue
                    
                    # Transform and upsert cards
                    page_synced = 0
                    for card_data in cards:
                        transformed = transform_card(card_data)
                        await upsert_card(db_session, transformed)
                        page_synced += 1
                    
                    # Commit batch
                    await db_session.commit()
                    total_synced += page_synced
                    successful_pages.add(page)
                    print(f"✅ Synced {page_synced} cards from page {page} (total: {total_synced})")
                    
                    # Rate limiting - longer delay to avoid 404s/429s
                    # Increased delay to respect API rate limits
                    await asyncio.sleep(3.0)
                    
                except Exception as e:
                    error_msg = str(e)
                    # If it's a 404 and we're past the expected pages, that's okay
                    if '404' in error_msg and max_pages and page > max_pages:
                        print(f"⚠️  Page {page} returned 404 (beyond expected range), stopping...")
                        break
                    print(f"❌ Error on page {page}: {e}")
                    await db_session.rollback()
                    failed_pages.add(page)
                    # Longer wait after error to avoid hitting rate limits
                    await asyncio.sleep(5.0)
            
            # Retry rounds: keep retrying failed pages
            retry_round = 1
            while failed_pages and retry_round <= max_retry_rounds:
                print(f"\n🔄 Retry round {retry_round}/{max_retry_rounds}: Retrying {len(failed_pages)} failed pages...")
                still_failed = set()
                
                for retry_page in list(failed_pages):
                    try:
                        print(f"📄 Retrying page {retry_page}...")
                        response = await fetch_cards_page(http_session, page=retry_page, page_size=page_size)
                        
                        cards = response.get('data', [])
                        if not cards:
                            print(f"⚠️  Page {retry_page} returned no cards on retry")
                            successful_pages.add(retry_page)
                            continue
                        
                        # Transform and upsert cards
                        page_synced = 0
                        for card_data in cards:
                            transformed = transform_card(card_data)
                            await upsert_card(db_session, transformed)
                            page_synced += 1
                        
                        # Commit batch
                        await db_session.commit()
                        total_synced += page_synced
                        successful_pages.add(retry_page)
                        print(f"✅ Successfully synced page {retry_page} on retry ({page_synced} cards, total: {total_synced})")
                        
                        # Longer delay between retries
                        await asyncio.sleep(2.0)
                        
                    except Exception as e:
                        print(f"❌ Still failed on page {retry_page}: {e}")
                        await db_session.rollback()
                        still_failed.add(retry_page)
                        await asyncio.sleep(2.0)
                
                failed_pages = still_failed
                retry_round += 1
    
    print(f"\n🎉 Sync complete!")
    print(f"   ✅ Successfully synced: {len(successful_pages)} pages")
    print(f"   📦 Total cards synced: {total_synced:,}")
    if total_count > 0:
        coverage = (total_synced / total_count) * 100
        print(f"   📊 Coverage: {coverage:.1f}% ({total_synced:,}/{total_count:,} cards)")
        if total_synced < total_count:
            missing = total_count - total_synced
            print(f"   ⚠️  Missing: {missing:,} cards")
    if failed_pages:
        print(f"   ⚠️  {len(failed_pages)} pages still failed after {max_retry_rounds} retry rounds: {sorted(list(failed_pages))}")
        print(f"   💡 You can run the sync again later to retry these pages.")


if __name__ == "__main__":
    asyncio.run(sync_all_cards())
