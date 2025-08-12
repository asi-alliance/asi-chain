const { expect, browser, $ } = require('@wdio/globals');

describe('My Login application', () => {
    it('should navigate to the Create Account page and fill in account name and password', async () => {
        await browser.url(`http://184.73.0.34:3000/#/`);

        await $("//button[contains(., 'Create Account')]").click();
        await $("//input[@placeholder='Enter account name']").click();
        await $("//input[@placeholder='Enter account name']").setValue('Test wallet');

        await $("//button[contains(., 'Create Account')]").click();

        await $("//input[@placeholder='Enter password']").click();
        await $("//input[@placeholder='Enter password']").setValue('123456789Password!');

        await $("//input[@placeholder='Confirm password']").click();
        await $("//input[@placeholder='Confirm password']").setValue('123456789Password!');

        await $("//button[contains(., 'Continue')]").click();

        await expect(await $("//h3[contains(., 'Test wallet')]")).toBePresent(); 
        await expect(await $("//h2[contains(.,'Your Accounts (1)')]")).toBePresent();

        await $("//button[contains(., 'Dashboard')]").click();
        await expect(await $("//h2[contains(., 'Account Details')]")).toBePresent();

        await $("//button[contains(., 'Send')]").click();
        await expect(await $("//h2[contains(.,'Send REV')]")).toBePresent();
        await expect(await $("//div[contains(.,'0.0000 REV')]")).toBePresent();

        await $("//button[contains(., 'Receive')]").click();
        await expect(await $("//h2[contains(.,'Receive Tokens')]")).toBePresent();
    
        await $("//button[contains(., 'History')]").click();
        await expect(await $("//h2[contains(.,'Transaction History')]")).toBePresent();
    
        await $("//button[contains(., 'Deploy')]").click();
        await expect(await $("//h2[contains(.,'Deploy Rholang Contract')]")).toBePresent();

        await $("//button[contains(., 'IDE')]").click();

        await $("//button[contains(., 'Generate Keys')]").click();
        await expect(await $("//h2[contains(.,'Key Generator')]")).toBePresent();
    
        await $("//button[contains(., 'Settings')]").click();
        await expect(await $("//h2[contains(.,'Network Settings')]")).toBePresent();
        await expect(await $("//h3[contains(.,'Predefined Networks')]")).toBePresent();
    });
});
