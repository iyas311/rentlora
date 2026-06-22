import logging

import boto3
from botocore.exceptions import ClientError
from config import get_settings

logger = logging.getLogger("booking-service.email")
settings = get_settings()
ses_client = boto3.client('ses', region_name=settings.aws_default_region)

# Verified SES sender, sourced from Parameter Store (/rentlora/{env}/ses-sender-email).
SENDER = settings.ses_sender_email

def send_welcome_email(to_email: str, user_name: str):
    """
    Sends a beautiful HTML welcome email using AWS SES.
    Note: Since your AWS account is in SES Sandbox mode, this will ONLY successfully send
    if 'to_email' is also verified in the SES Console.
    """
    subject = "Welcome to Rentlora! 🏡"

    body_html = f"""
    <html>
    <head></head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; background-color: #f7f7f7; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #ff5a5f; margin: 0; font-size: 32px;">Rentlora</h1>
            </div>

            <h2 style="color: #222; font-size: 24px;">Welcome, {user_name}!</h2>
            <p style="font-size: 16px; color: #555;">We are thrilled to have you join our community. Whether you are looking for a cozy cabin in the woods or a luxury beachfront villa, Rentlora is your passport to the perfect getaway.</p>

            <p style="font-size: 16px; color: #555;">Your account has been successfully created. You can now log in, explore beautiful properties, and book your next dream vacation.</p>

            <div style="text-align: center; margin: 40px 0;">
                <a href="https://rentlora.in" style="background-color: #ff5a5f; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Explore Properties</a>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 14px; color: #888; text-align: center;">Happy traveling!<br><strong>The Rentlora Team</strong></p>
            <p style="font-size: 12px; color: #aaa; text-align: center; margin-top: 20px;">If you did not create this account, please ignore this email.</p>
        </div>
    </body>
    </html>
    """

    try:
        response = ses_client.send_email(
            Destination={'ToAddresses': [to_email]},
            Message={
                'Body': {'Html': {'Charset': "UTF-8", 'Data': body_html}},
                'Subject': {'Charset': "UTF-8", 'Data': subject},
            },
            Source=SENDER,
        )
        logger.info(f"Welcome email sent successfully to {to_email}! Message ID: {response['MessageId']}")
    except ClientError as e:
        logger.error(f"Failed to send email to {to_email}: {e.response['Error']['Message']}")
