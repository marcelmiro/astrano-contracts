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

	const name = 'My Custom Token'
	const symbol = 'MCT'
	const totalSupply = 1000
	const beneficiary = () => signers[5].address

	before(async function () {
		signers = await getSigners()
	})

	it('Should create token with correct parameters', async function () {
		const args = [name, symbol, totalSupply, beneficiary()]

		const token = (await deployContract(
			signers[0],
			TokenArtifact,
			args,
		)) as Token

		const [_name, _symbol, _totalSupply, _beneficiaryBalance] =
			await Promise.all([
				token.name(),
				token.symbol(),
				token.totalSupply(),
				token.balanceOf(beneficiary()),
			])

		expect(_name).to.equal(name)
		expect(_symbol).to.equal(symbol)
		expect(_totalSupply).to.equal(totalSupply)
		expect(_beneficiaryBalance).to.equal(totalSupply)
	})

	it('Should revert on create contract with incorrect parameters', async function () {
		const deployBeneficiaryAddressZero = deployContract(
			signers[0],
			TokenArtifact,
			[name, symbol, totalSupply, AddressZero],
		)

		await expectRevert(
			deployBeneficiaryAddressZero,
			'beneficiary is the zero address',
		)
	})
})
