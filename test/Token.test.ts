import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

/* eslint-disable node/no-missing-import */
import { expectRevert } from '../src/helpers'

import TokenArtifact from '../artifacts/contracts/Token.sol/Token.json'
import { Token } from '../src/types/Token'
/* eslint-enable node/no-missing-import */

const {
	getSigners,
	constants: { AddressZero },
} = ethers
const { deployContract } = waffle

describe('Token', async function () {
	let signers: SignerWithAddress[]

	const tokenName = 'My Custom Token'
	const tokenSymbol = 'MCT'
	const tokenTotalSupply = 1000
	const beneficiary = () => signers[1].address

	before(async function () {
		signers = await getSigners()
	})

	it('Should create token with correct parameters', async function () {
		const args = [tokenName, tokenSymbol, tokenTotalSupply, beneficiary()]

		const token = (await deployContract(
			signers[0],
			TokenArtifact,
			args,
		)) as Token

		expect(await token.name()).to.equal(tokenName)
		expect(await token.symbol()).to.equal(tokenSymbol)
		expect(await token.totalSupply()).to.equal(tokenTotalSupply)
		expect(await token.balanceOf(beneficiary())).to.equal(tokenTotalSupply)
	})

	it('Should revert on create contract with incorrect parameters', async function () {
		const deployBeneficiaryAddressZero = deployContract(
			signers[0],
			TokenArtifact,
			[tokenName, tokenSymbol, tokenTotalSupply, AddressZero],
		)

		await expectRevert(
			deployBeneficiaryAddressZero,
			'beneficiary is the zero address',
		)
	})
})
