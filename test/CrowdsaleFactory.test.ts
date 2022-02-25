import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

/* eslint-disable node/no-missing-import */
import { getTime } from '../src/helpers'

import CrowdsaleFactoryArtifact from '../artifacts/contracts/CrowdsaleFactory.sol/CrowdsaleFactory.json'
import TokenArtifact from '../artifacts/contracts/Token.sol/Token.json'
import { CrowdsaleFactory } from '../src/types/CrowdsaleFactory'
import { Token } from '../src/types/Token'
/* eslint-enable node/no-missing-import */

const {
	getSigners,
	utils: { isAddress },
} = ethers
const { deployContract } = waffle

describe('CrowdsaleFactory', function () {
	let signers: SignerWithAddress[]
	let crowdsaleFactory: CrowdsaleFactory

	before(async function () {
		signers = await getSigners()
	})

	it('Should create contract with correct parameters', async function () {
		crowdsaleFactory = (await deployContract(
			signers[0],
			CrowdsaleFactoryArtifact,
		)) as CrowdsaleFactory
	})

	it('Should create crowdsale with correct parameters', async function () {
		const tokenArgs = ['Token', 'TKN', 10_000, signers[0].address]
		const pairTokenArgs = ['PairToken', 'PTKN', 10_000, signers[0].address]

		const token = (await deployContract(
			signers[0],
			TokenArtifact,
			tokenArgs,
		)) as Token

		const pairToken = (await deployContract(
			signers[0],
			TokenArtifact,
			pairTokenArgs,
		)) as Token

		const time = await getTime()

		const input = {
			token: token.address,
			pairToken: pairToken.address,
			owner: signers[0].address,
			finalizer: signers[0].address,
			rate: 100,
			cap: 10_000,
			individualCap: 5000,
			minPurchaseAmount: 1,
			goal: 8000,
			openingTime: time + 500,
			closingTime: time + 2500,
		}

		await crowdsaleFactory.createCrowdsale(input)
		const crowdsaleAddr = await crowdsaleFactory.callStatic.createCrowdsale(
			input,
		)

		expect(isAddress(crowdsaleAddr)).to.be.true
	})
})
