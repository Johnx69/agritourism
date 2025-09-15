import os
import smtplib
import ssl
from email.message import EmailMessage

# Load SMTP credentials from env vars for security
SMTP_USER = os.environ.get(
    "AWS_SMTP_USER", "AKIATCZBGNUAL2KF33HB"
)  # your SES SMTP username
SMTP_PASS = os.environ.get(
    "AWS_SMTP_PASS", "BOaS3ra1ad7jjUeC6MM3bw/nzPzvmw/eGinu2ElHaKhS"
)  # your SES SMTP password
SMTP_HOST = "email-smtp.us-east-1.amazonaws.com"  # region endpoint
SMTP_PORT = 587

FROM_EMAIL = "cuiyue@msu.edu"  # must be verified in SES
FROM_NAME = "Yue Cui"
TO_EMAIL = "anhdao@msu.edu"  # must also be verified if still in Sandbox

RESET_LINK = "https://yourapp.com/reset/ABC123"  # <- inject your actual, signed, time-limited URL
LOGIN_LINK = "https://yourapp.com/login"
APP_NAME = "Your App"


# ── Builders ──────────────────────────────────────────────────────────────────
def build_reset_password_email(to_email: str, reset_link: str) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = "Reset Your Password"
    msg["Reply-To"] = FROM_EMAIL

    # Plain-text fallback (always include the raw URL)
    msg.set_content(
        f"Password Reset Request\n\n"
        f"We received a request to reset your password for {APP_NAME}.\n"
        f"Reset your password here: {reset_link}\n\n"
        f"If you didn’t request this, you can ignore this message."
    )

    # HTML part (inline CSS for email client compatibility)
    html = f"""\
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f5f7fb; padding:24px; margin:0;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; padding:24px; border-radius:8px;">
      <h2 style="margin:0 0 12px; color:#111827;">Password Reset Request</h2>
      <p style="margin:0 0 16px; color:#374151;">
        We received a request to reset your password for <strong>{APP_NAME}</strong>.
        Click the button below to set a new one:
      </p>
      <p style="text-align:center; margin:24px 0;">
        <a href="{reset_link}"
           style="background:#2563EB; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:6px; display:inline-block; font-weight:600;">
          Reset Password
        </a>
      </p>
      <p style="margin:0 0 8px; color:#6B7280;">If the button doesn’t work, paste this link into your browser:</p>
      <p style="word-break:break-all; color:#2563EB; margin:0 0 16px;">
        <a href="{reset_link}" style="color:#2563EB; text-decoration:none;">{reset_link}</a>
      </p>
      <p style="margin:0; color:#9CA3AF;">If you didn’t request this, you can safely ignore this email.</p>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;" />
      <p style="margin:0; color:#9CA3AF;">— {APP_NAME} Team</p>
    </div>
  </body>
</html>
"""
    msg.add_alternative(html, subtype="html")
    return msg


def build_password_set_email(to_email: str, login_link: str) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = "Your Password Has Been Updated"
    msg["Reply-To"] = FROM_EMAIL

    msg.set_content(
        f"Password Updated Successfully\n\n"
        f"Your password has been updated for {APP_NAME}.\n"
        f"Log in here: {login_link}\n"
    )

    html = f"""\
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f5f7fb; padding:24px; margin:0;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; padding:24px; border-radius:8px;">
      <h2 style="margin:0 0 12px; color:#111827;">Password Updated Successfully</h2>
      <p style="margin:0 0 16px; color:#374151;">
        Your password has been updated for <strong>{APP_NAME}</strong>. You can now log in:
      </p>
      <p style="text-align:center; margin:24px 0;">
        <a href="{login_link}"
           style="background:#10B981; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:6px; display:inline-block; font-weight:600;">
          Go to Login
        </a>
      </p>
      <p style="margin:0 0 8px; color:#6B7280;">Or paste this link into your browser:</p>
      <p style="word-break:break-all; color:#2563EB; margin:0;">
        <a href="{login_link}" style="color:#2563EB; text-decoration:none;">{login_link}</a>
      </p>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;" />
      <p style="margin:0; color:#9CA3AF;">— {APP_NAME} Team</p>
    </div>
  </body>
</html>
"""
    msg.add_alternative(html, subtype="html")
    return msg


# ── Send helper ────────────────────────────────────────────────────────────────
def send_email(msg: EmailMessage):
    context = ssl.create_default_context()
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls(context=context)
        server.ehlo()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)


# ── Usage ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    try:
        # 1) Send reset email
        msg = build_reset_password_email(TO_EMAIL, RESET_LINK)
        send_email(msg)
        print("✅ Reset email sent!")

        # 2) Send confirmation email (optional)
        # msg2 = build_password_set_email(TO_EMAIL, LOGIN_LINK)
        # send_email(msg2)
        # print("✅ Confirmation email sent!")

    except Exception as e:
        print(f"❌ Message could not be sent. Error: {e}")
