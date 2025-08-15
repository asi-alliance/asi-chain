const { expect, browser, $ } = require('@wdio/globals');

describe('ASI Wallet - Create → Settings → Import → Transfer → Validate', () => {
  // Shared test data
  const BASE_URL = (process.env.URL_TO_TEST || 'http://184.73.0.34:3000').replace(/\/$/, '');
  const ACCOUNT_1_NAME = `Test Wallet ${Date.now()}`;
  const ACCOUNT_2_NAME = `Test Imported ${Date.now() + 1}`;
  const ACCOUNT_PASSWORD = 'TestPass123!';
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const VALIDATOR_IP = '54.175.6.183';
  const TRANSFER_AMOUNT = '1';

  // Helper functions
  const parseBalance = (text) => parseFloat(text.match(/([0-9]*\.?[0-9]+)\s*REV/i)?.[1] || '0');

  it('should create and import accounts, then send first transfer', async function() {
    this.timeout(300000); // 5 minutes
    
    if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY is not set');

    // Step 1: Create first account
    console.log('Step 1: Creating first account...');
    await browser.url(`${BASE_URL}/#/`);
    
    const createSection = await $('//h2[normalize-space()="Create New Account"]');
    await createSection.waitForDisplayed({ timeout: 10000 });
    await $('(//h2[normalize-space()="Create New Account"]/following::input[@placeholder="Enter account name"])[1]').setValue(ACCOUNT_1_NAME);
    await $('(//h2[normalize-space()="Create New Account"]/following::button[normalize-space()="Create Account"])[1]').click();
    await $('//input[@placeholder="Enter password"]').setValue(ACCOUNT_PASSWORD);
    await $('//input[@placeholder="Confirm password"]').setValue(ACCOUNT_PASSWORD);
    await $('//button[normalize-space()="Continue"]').click();

    // Step 2: Configure network settings
    console.log('Step 2: Configuring network settings...');
    await browser.url(`${BASE_URL}/#/settings`);
    await $('//header//select').selectByAttribute('value', 'custom');
    await $('//button[contains(.,"Edit Configuration")]').click();
    
    const validatorInput = $('//h3[normalize-space()="Custom network - validator node"]/following::label[normalize-space()="IP/Domain:"][1]/following::input[1]');
    await validatorInput.click();
    await browser.keys(['Control', 'a']);
    await browser.keys('Backspace');
    await validatorInput.setValue(VALIDATOR_IP);
    
    const readonlyInput = $('//h3[normalize-space()="Custom network - read-only node"]/following::label[normalize-space()="IP/Domain:"][1]/following::input[1]');
    await readonlyInput.click();
    await browser.keys(['Control', 'a']);
    await browser.keys('Backspace');
    await readonlyInput.setValue(VALIDATOR_IP);
    
    await $('//button[normalize-space()="Save Configuration"]').click();

    // Step 3: Navigate to accounts
    console.log('Step 3: Navigating to accounts...');
    await browser.url(`${BASE_URL}/#/accounts`);
    await $(`//h3[normalize-space()="${ACCOUNT_1_NAME}"]`).waitForDisplayed({ timeout: 10000 });

    // Step 4: Import second account
    console.log('Step 4: Importing second account...');
    const importSection = await $('//h2[normalize-space()="Import Account"]');
    await importSection.scrollIntoView();
    
    await $('(//h2[normalize-space()="Import Account"]/following::input[@placeholder="Enter account name"])[1]').setValue(ACCOUNT_2_NAME);
    await $('(//h2[normalize-space()="Import Account"]/following::select)[1]').selectByAttribute('value', 'private');
    await $('(//h2[normalize-space()="Import Account"]/following::input[@placeholder="Enter private key (64 hex characters)"][@type="password"])[1]').setValue(PRIVATE_KEY);
    await $('(//h2[normalize-space()="Import Account"]/following::button[normalize-space()="Import Account"])[1]').click();
    await $('//input[@placeholder="Enter password"]').setValue(ACCOUNT_PASSWORD);
    await $('//input[@placeholder="Confirm password"]').setValue(ACCOUNT_PASSWORD);
    await $('//button[normalize-space()="Continue"]').click();

    // Step 5: Logout and login
    console.log('Step 5: Logout and login...');
    await $('//button[normalize-space()="Logout"]').click();
    await $('//input[@placeholder="Enter your password"]').setValue(ACCOUNT_PASSWORD);
    await $('//button[normalize-space()="Unlock"]').click();

    // Step 6: Verify imported account balance
    console.log('Step 6: Verifying imported account balance...');
    await browser.url(`${BASE_URL}/#/accounts`);
    const importedBalanceEl = await $(`//h3[normalize-space()="${ACCOUNT_2_NAME}"]/following-sibling::div[contains(normalize-space(),"REV")]`);
    await importedBalanceEl.waitForDisplayed({ timeout: 10000 });
    const initialBalance = parseBalance(await importedBalanceEl.getText());
    console.log(`Initial balance of ${ACCOUNT_2_NAME}: ${initialBalance} REV`);
    expect(initialBalance).toBeGreaterThanOrEqual(0);

    // Step 7: Get recipient address
    console.log('Step 7: Getting recipient address...');
    const headerToggle = await $('//header//button[.//span[text()="▼"]]');
    await headerToggle.click();
    await $(`//header//button[.//span[text()="▼"]]/following-sibling::div//button[.//span[normalize-space()="${ACCOUNT_1_NAME}"]]`).click();
    
    await browser.url(`${BASE_URL}/#/receive`);
    const recipientAddress = await (await $('//div[normalize-space()="REV Address"]/following-sibling::div[1]')).getText();
    console.log(`First account address: ${recipientAddress}`);

    // Step 8: Send transfer
    console.log('Step 8: Sending transfer...');
    await headerToggle.click();
    await $(`//header//button[.//span[text()="▼"]]/following-sibling::div//button[.//span[normalize-space()="${ACCOUNT_2_NAME}"]]`).click();
    
    await browser.url(`${BASE_URL}/#/send`);
    await $('//label[contains(.,"Recipient Address")]/following::input[1]').setValue(recipientAddress);
    await $('//label[normalize-space()="Amount"]/following::input[1]').setValue(TRANSFER_AMOUNT);
    await $('//button[normalize-space()="Send Transaction"]').click();
    await $('//button[normalize-space()="Confirm & Send"]').click();
    
    const sentMsg = await $('//*[contains(text(),"Transaction sent!")]');
    await sentMsg.waitForDisplayed({ timeout: 60000 });
    console.log('Transaction sent successfully!');

// Step 9: Wait for balance deduction (up to 10 minutes with 30-second intervals)
    console.log('Step 9: Waiting for balance update (checking every 30 seconds for up to 10 minutes)...');
    const startTime = Date.now();
    let balanceUpdated = false;
    const maxWaitTime = 600000; // 10 minutes
    const checkInterval = 30000; // 30 seconds
    
    try {
      while (Date.now() - startTime < maxWaitTime && !balanceUpdated) {
        // Keep session alive by getting current URL
        const currentUrl = await browser.getUrl();
        console.log(`[Keep-alive] Current URL: ${currentUrl}`);
        
        await browser.url(`${BASE_URL}/#/accounts`);
        await browser.pause(3000);
        
        // Click refresh if available
        const refreshBtn = await $('//button[normalize-space()="Refresh Balances"]');
        if (await refreshBtn.isExisting()) {
          await refreshBtn.click();
          await browser.pause(5000);
        }
        
        // Check current balance
        const currentBalanceEl = await $(`//h3[normalize-space()="${ACCOUNT_2_NAME}"]/following-sibling::div[contains(normalize-space(),"REV")]`);
        if (await currentBalanceEl.isExisting()) {
          const currentBalance = parseBalance(await currentBalanceEl.getText());
          const elapsedMinutes = Math.round((Date.now() - startTime) / 60000);
          console.log(`[${elapsedMinutes} min] Current balance: ${currentBalance} REV (initial: ${initialBalance} REV)`);
          
          // Check if balance decreased (accounting for fees)
          if (currentBalance <= initialBalance - parseFloat(TRANSFER_AMOUNT)) {
            console.log(`✓ Balance updated! Deducted: ${(initialBalance - currentBalance).toFixed(4)} REV`);
            balanceUpdated = true;
          }
        }
        
        if (!balanceUpdated) {
          await browser.pause(checkInterval);
        }
      }
    } catch (error) {
      console.error('Error during balance check:', error.message);
      throw error;
    }
    
    if (!balanceUpdated) {
      console.log(`Warning: Balance not updated after ${maxWaitTime/60000} minutes. Continuing with test...`);
    }
    expect(balanceUpdated).toBe(true);

    // Step 10: Verify receiver balance (wait up to 5 minutes)
    console.log('Step 10: Checking receiver balance (up to 5 minutes)...');
    const receiverStartTime = Date.now();
    let receiverUpdated = false;
    
    while (Date.now() - receiverStartTime < 300000 && !receiverUpdated) {
      await browser.url(`${BASE_URL}/#/accounts`);
      await browser.pause(2000);
      
      const refreshBtn = await $('//button[normalize-space()="Refresh Balances"]');
      if (await refreshBtn.isExisting()) {
        await refreshBtn.click();
        await browser.pause(3000);
      }
      
      const receiverBalanceEl = await $(`//h3[normalize-space()="${ACCOUNT_1_NAME}"]/following-sibling::div[contains(normalize-space(),"REV")]`);
      if (await receiverBalanceEl.isExisting()) {
        const receiverBalance = parseBalance(await receiverBalanceEl.getText());
        console.log(`Receiver balance: ${receiverBalance} REV`);
        
        if (receiverBalance >= parseFloat(TRANSFER_AMOUNT)) {
          console.log('Receiver received the transfer!');
          expect(receiverBalance).toBeGreaterThanOrEqual(parseFloat(TRANSFER_AMOUNT));
          receiverUpdated = true;
        }
      }
      
      if (!receiverUpdated) {
        console.log(`Waiting for receiver... (${Math.round((Date.now() - receiverStartTime) / 1000)}s elapsed)`);
        await browser.pause(20000); // Wait 20 seconds before next check
      }
    }
    
    expect(receiverUpdated).toBe(true);

    // Step 11: Send transfer back
    console.log('Step 11: Sending transfer back...');
    await headerToggle.click();
    await $(`//header//button[.//span[text()="▼"]]/following-sibling::div//button[.//span[normalize-space()="${ACCOUNT_1_NAME}"]]`).click();
    
    await headerToggle.click();
    await $(`//header//button[.//span[text()="▼"]]/following-sibling::div//button[.//span[normalize-space()="${ACCOUNT_2_NAME}"]]`).click();
    await browser.url(`${BASE_URL}/#/receive`);
    const secondAccountAddress = await (await $('//div[normalize-space()="REV Address"]/following-sibling::div[1]')).getText();
    
    await headerToggle.click();
    await $(`//header//button[.//span[text()="▼"]]/following-sibling::div//button[.//span[normalize-space()="${ACCOUNT_1_NAME}"]]`).click();
    
    await browser.url(`${BASE_URL}/#/send`);
    await $('//label[contains(.,"Recipient Address")]/following::input[1]').setValue(secondAccountAddress);
    await $('//label[normalize-space()="Amount"]/following::input[1]').setValue(TRANSFER_AMOUNT);
    await $('//button[normalize-space()="Send Transaction"]').click();
    await $('//button[normalize-space()="Confirm & Send"]').click();
    
    const returnSentMsg = await $('//*[contains(text(),"Transaction sent!")]');
    await returnSentMsg.waitForDisplayed({ timeout: 60000 });
    console.log('Return transaction sent!');

    // Step 12: Verify history
    console.log('Step 12: Verifying transaction history...');
    await browser.url(`${BASE_URL}/#/history`);
    await browser.waitUntil(
      async () => !(await $('//*[contains(text(),"No transactions found")]').isExisting()), 
      { timeout: 60000, interval: 5000 }
    );
    console.log('Test completed successfully!');
  });
});