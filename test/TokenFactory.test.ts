import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

/* eslint-disable node/no-missing-import */
import TokenFactoryArtifact from '../artifacts/contracts/TokenFactory.sol/TokenFactory.json'
import { TokenFactory } from '../src/types/TokenFactory'
/* eslint-enable node/no-missing-import */

const {
	getSigners,
	utils: { isAddress },
} = ethers
const { deployContract } = waffle

describe('TokenFactory', function () {
	let signers: SignerWithAddress[]
	let tokenFactory: TokenFactory

	before(async function () {
		signers = await getSigners()
	})

	it('Should create contract with correct parameters', async function () {
		tokenFactory = (await deployContract(
			signers[0],
			TokenFactoryArtifact,
		)) as TokenFactory
	})

	it('Should create token with correct parameters', async function () {
		const name = 'Test token'
		const symbol = 'TT'
		const totalSupply = 1250

		await tokenFactory.createToken(name, symbol, totalSupply)
		const tokenAddr = await tokenFactory.callStatic.createToken(
			name,
			symbol,
			totalSupply,
		)

		expect(isAddress(tokenAddr)).to.be.true
	})
})
