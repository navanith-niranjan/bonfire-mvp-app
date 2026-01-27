"""Email service module for sending emails via Resend."""
import logging
from typing import List, Dict, Any, Optional
import resend
from app.config import settings

logger = logging.getLogger(__name__)

# Initialize Resend API key
if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY
else:
    logger.warning("RESEND_API_KEY not configured. Email functionality will be disabled.")


def format_collectibles_list(items_details: List[Dict[str, Any]]) -> str:
    """
    Format a list of collectibles (cards) into an HTML string for email.
    
    Args:
        items_details: List of dictionaries with 'name', 'value', and optionally 'image_url'
        
    Returns:
        Formatted HTML string with collectibles list
    """
    if not items_details:
        return "<p>No items listed.</p>"
    
    html_parts = ["<ul style='list-style: none; padding: 0;'>"]
    
    for item in items_details:
        name = item.get("name", "Unknown Item")
        value = item.get("value", 0.0)
        
        # Format condition if available in item_data
        condition_str = ""
        if isinstance(item.get("item_data"), dict):
            condition = item.get("item_data", {}).get("condition", "")
            if condition:
                condition_str = f" - {condition}"
        
        html_parts.append(
            f"<li style='margin-bottom: 12px; padding: 8px; border-left: 3px solid #ccc;'>"
            f"<strong>{name}</strong>{condition_str}<br>"
            f"<span style='color: #666; font-size: 0.9em;'>Estimated Value: ${value:.2f}</span>"
            f"</li>"
        )
    
    html_parts.append("</ul>")
    return "".join(html_parts)


def send_vault_confirmation_email(
    to_email: str,
    user_name: str,
    items_details: List[Dict[str, Any]],
    vault_id: str
) -> bool:
    """
    Send vault confirmation email using Resend template.
    
    Args:
        to_email: Recipient email address
        user_name: User's name (or email username if name not available)
        items_details: List of card/item details with name, value, etc.
        vault_id: Vault ID (transaction ID or submission identifier)
        
    Returns:
        True if email was sent successfully, False otherwise
    """
    if not settings.RESEND_API_KEY:
        logger.error("Resend API key not configured. Cannot send email.")
        return False
    
    if not settings.RESEND_TEMPLATE_ID:
        logger.error("RESEND_TEMPLATE_ID not configured. Cannot send email.")
        return False
    
    if not settings.RESEND_FROM_EMAIL:
        logger.error("RESEND_FROM_EMAIL not configured. Cannot send email.")
        return False
    
    try:
        # Format collectibles list
        collectibles_list = format_collectibles_list(items_details)
        
        # Send email using Resend template
        params = {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to_email],
            "template": {
                "id": settings.RESEND_TEMPLATE_ID,
                "variables": {
                    "User_Name": user_name,
                    "Collectibles_List": collectibles_list,
                    "Vault_ID": vault_id,
                }
            }
        }
        
        response = resend.Emails.send(params)
        
        logger.info(f"Vault confirmation email sent successfully to {to_email}. Email ID: {response.get('id', 'unknown')}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send vault confirmation email to {to_email}: {str(e)}", exc_info=True)
        return False
