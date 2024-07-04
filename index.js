const { ethers } = require('ethers');
const bip39 = require('bip39');
const hdkey = require('hdkey');
const fs = require('fs');
const readlineSync = require('readline-sync');
const colors = require('colors');

const RPC_URL = 'https://rpc-testnet.unit0.dev';
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

async function sendUnit(fromWallet, toAddress, amount) {
  const tx = {
    to: toAddress,
    value: ethers.utils.parseUnits(amount.toString(), 'ether'),
  };

  const transaction = await fromWallet.sendTransaction(tx);
  await transaction.wait();
  console.log(colors.green('Transaction confirmed with hash:'), transaction.hash);
}

function generateRandomAddresses(count) {
  return Array.from({ length: count }, () =>
    ethers.Wallet.createRandom().address
  );
}

async function getWalletFromSeed(seedPhrase) {
  const seed = await bip39.mnemonicToSeed(seedPhrase);
  const hdwallet = hdkey.fromMasterSeed(seed);
  const path = "m/44'/60'/0'/0/0"; // Standard Ethereum derivation path
  const wallet = hdwallet.derive(path);
  return new ethers.Wallet(wallet.privateKey, provider);
}

function getWalletFromPrivateKey(privateKey) {
  return new ethers.Wallet(privateKey, provider);
}

function displayHeader() {
  process.stdout.write('\x1Bc');
  console.log('========================================'.cyan);
  console.log('=           Unit Zero BOT              ='.cyan);
  console.log('=     Created by HappyCuanAirdrop      ='.cyan);
  console.log('=    https://t.me/HappyCuanAirdrop     ='.cyan);
  console.log('========================================'.cyan);
  console.log();
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  displayHeader();
  const method = readlineSync.question(
    'Select input method (0 for seed phrase, 1 for private key): '
  );

  let seedPhrasesOrKeys;
  if (method === '0') {
    seedPhrasesOrKeys = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));
    if (!Array.isArray(seedPhrasesOrKeys) || seedPhrasesOrKeys.length === 0) {
      throw new Error(
        colors.red('accounts.json is not set correctly or is empty')
      );
    }
  } else if (method === '1') {
    seedPhrasesOrKeys = JSON.parse(
      fs.readFileSync('privateKeys.json', 'utf-8')
    );
    if (!Array.isArray(seedPhrasesOrKeys) || seedPhrasesOrKeys.length === 0) {
      throw new Error(
        colors.red('privateKeys.json is not set correctly or is empty')
      );
    }
  } else {
    throw new Error(colors.red('Invalid input method selected'));
  }

  const defaultAddressCount = 100;
  const addressCountInput = readlineSync.question(
    `How many random addresses do you want to generate? (default is ${defaultAddressCount}): `
  );
  const addressCount = addressCountInput
    ? parseInt(addressCountInput, 10)
    : defaultAddressCount;

  if (isNaN(addressCount) || addressCount <= 0) {
    throw new Error(colors.red('Invalid number of addresses specified'));
  }

  const randomAddresses = generateRandomAddresses(addressCount);

  let amountToSend;
  do {
    const amountInput = readlineSync.question(
      'Enter the amount of UNIT0 to send (default is 0.001 UNIT0): '
    );
    amountToSend = amountInput ? parseFloat(amountInput) : 0.001;

    if (isNaN(amountToSend) || amountToSend <= 0) {
      console.log(
        colors.red(
          'Invalid amount specified. The amount must be greater than 0.'
        )
      );
    }
  } while (isNaN(amountToSend) || amountToSend <= 0);

  const defaultDelay = 1000;
  const delayInput = readlineSync.question(
    `Enter the delay between transactions in milliseconds (default is ${defaultDelay}ms): `
  );
  const delayBetweenTx = delayInput ? parseInt(delayInput, 10) : defaultDelay;

  if (isNaN(delayBetweenTx) || delayBetweenTx < 0) {
    throw new Error(colors.red('Invalid delay specified'));
  }

  for (const [index, seedOrKey] of seedPhrasesOrKeys.entries()) {
    let fromWallet;
    if (method === '0') {
      fromWallet = await getWalletFromSeed(seedOrKey);
    } else {
      fromWallet = getWalletFromPrivateKey(seedOrKey);
    }
    console.log(
      colors.yellow(
        `Sending UNIT0 from account ${
          index + 1
        }: ${fromWallet.address}`
      )
    );

    for (const address of randomAddresses) {
      try {
        await sendUnit(fromWallet, address, amountToSend);
        console.log(
          colors.green(`Successfully sent ${amountToSend} UNIT0 to ${address}`)
        );
      } catch (error) {
        console.error(colors.red(`Failed to send UNIT0 to ${address}:`), error);
      }
      await delay(delayBetweenTx);
    }
  }
})();
