//before start check balances
const { expect, browser, $ } = require('@wdio/globals');
require('dotenv').config();

describe('My Login application', () => {
    it('should navigate to Send page and send tokens', async () => {
        await browser.url(`http://184.73.0.34:3000/#/`);

        await $("//button[contains(., 'Create Account')]").click();
        await $("//h2[text()='Import Account']/following-sibling::div/input[@placeholder='Enter account name']]").click();
        await $("//h2[text()='Import Account']/following-sibling::div/input[@placeholder='Enter account name']").setValue('Test wallet');
        await $("//input[@placeholder='Enter private key (64 hex characters)']").setValue(PRIVATE_KEY);
        await $("//button[contains(., 'Import Account')]").click();

        await $("//input[@placeholder='Enter password']").click();
        await $("//input[@placeholder='Enter password']").setValue('123456789Password!');

        await $("//input[@placeholder='Confirm password']").click();
        await $("//input[@placeholder='Confirm password']").setValue('123456789Password!');

        await $("//button[contains(., 'Continue')]").click();

        await expect(await $("//h3[contains(., 'Test wallet')]")).toBePresent(); 
        await expect(await $("//h2[contains(.,'Your Accounts (2)')]")).toBePresent();

        await $("//button[contains(., 'Settings')]").click();
        await expect(await $("//h2[contains(.,'Network Settings')]")).toBePresent();
        await expect(await $("//h3[contains(.,'Predefined Networks')]")).toBePresent();
        await $("//button[contains(., 'Edit Configuration')]").click();
        await $("//input[1]").click();
        await $("//input[1]").setValue('44.198.8.24');
        await $("//input[4]").click();
        await $("//input[4]").setValue('44.198.8.24');
        await $("//button[contains(., 'Save Configuration')]").click();

        await $("//button[contains(., 'Dashboard')]").click();
        await expect(await $("//h2[contains(., 'Account Details')]")).toBePresent();
        await expect(await $("//span[contains(., 'Connected')]")).toBePresent();

        await $("//button[contains(., 'Receive')]").click();
        await expect(await $("//h2[contains(.,'Receive Tokens')]")).toBePresent();
    
        await $("//button[contains(., 'Send')]").click();
        await expect(await $("//h2[contains(.,'Send REV')]")).toBePresent();
        await expect(await $("//div[contains(.,'0.0000 REV')]")).toBePresent();

        await $("//button[contains(., 'History')]").click();
        await expect(await $("//h2[contains(.,'Transaction History')]")).toBePresent();
    
    });
});
