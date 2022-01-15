/* eslint-disable node/no-missing-import */
import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'

import TokenArtifact from '../artifacts/contracts/Token.sol/Token.json'
import { Token } from '../src/types/Token'

const { getSigners } = ethers
const { deployContract } = waffle

describe('Token', function () {
	let token: Token

	const tokenName = 'My Custom Token'
	const tokenSymbol = 'MCT'
	const tokenTotalSupply = '100'

	beforeEach(async () => {
		const signers = await getSigners()

		const data = [tokenName, tokenSymbol, tokenTotalSupply]

		token = (await deployContract(signers[0], TokenArtifact, data)) as Token
	})

	it('Should create token with correct parameters', async function () {
		expect(await token.name()).to.equal(tokenName)
		expect(await token.symbol()).to.equal(tokenSymbol)
		expect(await token.totalSupply()).to.equal(tokenTotalSupply)
	})
})
