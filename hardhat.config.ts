import * as dotenv from 'dotenv'
import { HardhatUserConfig, task } from 'hardhat/config'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import 'hardhat-gas-reporter'
import 'solidity-coverage'
import "hardhat-contract-sizer";

dotenv.config()

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (_taskArgs, hre) => {
	const accounts = await hre.ethers.getSigners()

	for (const account of accounts) {
		console.log(account.address)
	}
})

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
	solidity: '0.8.9',
	networks: {
		testnet: {
			url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
			chainId: 97,
			// gasPrice: 20000000000,
			accounts: [
				'aaf7b09474b73cf7ab1a2d5968f053f307bf6e4fca005ce070cff1a1fe3b8f0c',
			],
		},
		ropsten: {
			url: process.env.ROPSTEN_URL || '',
			accounts:
				process.env.PRIVATE_KEY !== undefined
					? [process.env.PRIVATE_KEY]
					: [],
		},
	},
	gasReporter: {
		enabled: process.env.REPORT_GAS !== undefined,
		currency: 'USD',
	},
	// etherscan: {
	// 	apiKey: process.env.ETHERSCAN_API_KEY,
	// },
	typechain: {
		outDir: 'src/types',
		target: 'ethers-v5',
		alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
		externalArtifacts: ['externalArtifacts/*.json'], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
	},
}

const forkingUrl = process.env.FORKING_URL
const forkingBlock = process.env.FORKING_BLOCK

if (forkingUrl && forkingBlock && parseInt(forkingBlock))
	config.networks = {
		...config.networks,
		hardhat: {
			forking: {
				url: forkingUrl,
				blockNumber: parseInt(forkingBlock),
			},
		},
	}

export default config
