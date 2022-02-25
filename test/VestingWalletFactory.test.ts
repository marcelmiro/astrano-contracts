import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

/* eslint-disable node/no-missing-import */
import VestingWalletFactoryArtifact from '../artifacts/contracts/VestingWalletFactory.sol/VestingWalletFactory.json'
import { VestingWalletFactory } from '../src/types/VestingWalletFactory'
/* eslint-enable node/no-missing-import */

const {
	getSigners,
	utils: { isAddress },
} = ethers
const { deployContract } = waffle

describe('VestingWalletFactory', function () {
	let signers: SignerWithAddress[]
	let vestingWalletFactory: VestingWalletFactory

	before(async function () {
		signers = await getSigners()
	})

	it('Should create contract with correct parameters', async function () {
		vestingWalletFactory = (await deployContract(
			signers[0],
			VestingWalletFactoryArtifact,
		)) as VestingWalletFactory
	})

	it('Should create vesting wallet with correct parameters', async function () {
		const beneficiary = signers[1].address
		await vestingWalletFactory.createVestingWallet(beneficiary)
		const vestingWalletAddr =
			await vestingWalletFactory.callStatic.createVestingWallet(
				beneficiary,
			)

		expect(isAddress(vestingWalletAddr)).to.be.true
	})
})
