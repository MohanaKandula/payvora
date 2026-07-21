# PayVora Member Account & Profile Structure

## Overview
Your PayVora Account represents your digital banking profile, linking all your spendable wallets, yield vaults, identity verification (KYC), and security settings.

## ACCOUNT_DEACTIVATION
To deactivate your PayVora account, follow these steps:
1. Navigate to Settings -> Account Settings.
2. Select "Deactivate Account".
3. Ensure your wallet balance is exactly $0.00 and all pending transactions are settled.
4. Enter your 4-digit Transaction PIN to confirm.
5. Your account will be securely placed in a disabled state, protecting your historical event-sourced ledger records.

## ACCOUNT_REACTIVATION
To reactivate a previously deactivated PayVora account, follow these steps:
1. Attempt to log in with your original username and password on the login screen.
2. A prompt will appear stating "Account is Deactivated. Would you like to reactivate?".
3. Click "Request Reactivation".
4. Enter the one-time passcode (OTP) sent to your registered email or phone number.
5. Upon successful validation, your profile and all historical balances will be restored immediately.

## CHANGE_PHONE
To change your registered phone number, follow these steps:
1. Navigate to Profile -> Contact Information.
2. Click the edit icon next to your Phone Number.
3. Enter your new phone number.
4. Verify the change by entering the 6-digit SMS OTP sent to your new phone number.
5. Enter your 4-digit Transaction PIN to complete the change.

## CHANGE_EMAIL
To change your registered email address, follow these steps:
1. Navigate to Profile -> Contact Information.
2. Click the edit icon next to your Email Address.
3. Enter your new email address.
4. A verification link will be sent to your new email address.
5. Click the verification link to confirm ownership.
6. Enter your 4-digit Transaction PIN to finalize the update.

## LINK_BANK
To link an external bank account to your PayVora profile, follow these steps:
1. Navigate to Dashboard -> Linked Accounts.
2. Click "Link New Bank Account".
3. Choose your bank from the list or select Plaid to log in securely.
4. Select the account type (Checking or Savings) and enter your Account Number and Routing Number.
5. Complete the micro-deposit verification (two small deposits credited to your external bank within 1-2 business days).
6. Enter the micro-deposit amounts in PayVora to authorize the link.

## REMOVE_BANK
To remove a linked external bank account, follow these steps:
1. Navigate to Dashboard -> Linked Accounts.
2. Select the linked bank account you wish to remove.
3. Click "Remove / Unlink".
4. Ensure there are no pending ACH transfers or recurring deposits configured with this bank.
5. Confirm the action by entering your 4-digit Transaction PIN.
6. The bank link will be removed immediately.

## PROFILE_UPDATE
To update your general profile information (legal name, address, or notification preferences), follow these steps:
1. Navigate to Profile -> Edit Profile.
2. Modify your mailing address, display name, or preferences.
3. If changing your legal name, you must upload a supporting document (marriage certificate or court order) under the Verification tab.
4. Click "Save Changes".
5. The changes will be applied instantly.
