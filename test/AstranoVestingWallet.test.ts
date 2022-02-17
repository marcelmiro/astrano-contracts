import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

/* eslint-disable node/no-missing-import */
import { expectRevert, getTime, setTime } from '../src/helpers'

import AstranoVestingWalletArtifact from '../artifacts/contracts/AstranoVestingWallet.sol/AstranoVestingWallet.json'
import TokenArtifact from '../artifacts/contracts/Token.sol/Token.json'
import { AstranoVestingWallet } from '../src/types/AstranoVestingWallet'
import { Token } from '../src/types/Token'
/* eslint-enable node/no-missing-import */

const {
	getSigners,
	constants: { AddressZero },
} = ethers
const { deployContract } = waffle

describe('AstranoVestingWallet', async function () {
	let signers: SignerWithAddress[]
	let astranoVestingWallet: AstranoVestingWallet

	let beneficiary = () => signers[1]
	const beneficiaryAddr = () => beneficiary().address
	const startIn = 450
	const duration = 100

	const calculateReleasable = (
		balance: number,
		time: number,
		start: number,
	) => (balance * (time - start)) / duration

	before(async function () {
		signers = await getSigners()
	})

	it('Should create contract with correct parameters', async function () {
		const args = [beneficiaryAddr(), startIn, duration]

		astranoVestingWallet = (await deployContract(
			signers[0],
			AstranoVestingWalletArtifact,
			args,
		)) as AstranoVestingWallet

		expect(await astranoVestingWallet.beneficiary()).to.equal(
			beneficiaryAddr(),
		)
		expect(await astranoVestingWallet.startIn()).to.equal(startIn)
		expect(await astranoVestingWallet.duration()).to.equal(duration)
	})

	it('Should revert on create contract with incorrect parameters', async function () {
		const deployBeneficiaryAddressZero = deployContract(
			signers[0],
			AstranoVestingWalletArtifact,
			[AddressZero, startIn, duration],
		)

		const deployDurationZero = deployContract(
			signers[0],
			AstranoVestingWalletArtifact,
			[beneficiaryAddr(), startIn, 0],
		)

		await Promise.all([
			expectRevert(
				deployBeneficiaryAddressZero,
				'beneficiary is the zero address',
			),
			expectRevert(deployDurationZero, 'duration is 0'),
		])
	})

	context('setBeneficiary', function () {
		it('Should allow to set beneficiary', async function () {
			const newBeneficiary = signers[2]

			await astranoVestingWallet
				.connect(beneficiary())
				.setBeneficiary(newBeneficiary.address)

			expect(await astranoVestingWallet.beneficiary()).to.equal(
				newBeneficiary.address,
			)

			beneficiary = () => newBeneficiary
		})

		it('Should not allow to set beneficiary from a non-beneficiary wallet', async function () {
			const nonBeneficiary = signers[0]

			const setBeneficiaryFromNonBeneficiary = astranoVestingWallet
				.connect(nonBeneficiary)
				.setBeneficiary(nonBeneficiary.address)

			await expectRevert(
				setBeneficiaryFromNonBeneficiary,
				'caller not beneficiary',
			)
		})

		it('Should not allow to set beneficiary to the zero address', async function () {
			const setBeneficiaryToZeroAddress = astranoVestingWallet
				.connect(beneficiary())
				.setBeneficiary(AddressZero)

			await expectRevert(
				setBeneficiaryToZeroAddress,
				'beneficiary is the zero address',
			)
		})
	})

	context('deposit', function () {
		let token: Token

		before(async function () {
			const tokenArgs = ['Token', 'TKN', 1000000, signers[0].address]
			token = (await deployContract(
				signers[0],
				TokenArtifact,
				tokenArgs,
			)) as Token
		})

		it('Should allow to deposit with correct parameters', async function () {
			const amount = 10
			await token.approve(astranoVestingWallet.address, amount)
			await astranoVestingWallet.deposit(token.address, amount)

			const time = await getTime()

			expect(
				await token.balanceOf(astranoVestingWallet.address),
			).to.equal(amount)
			expect(await astranoVestingWallet.start(token.address)).to.equal(
				time + startIn,
			)
		})

		it('Should not allow to deposit if amount is 0', async function () {
			await expectRevert(
				astranoVestingWallet.deposit(token.address, 0),
				'amount is 0',
			)
		})

		it('Should allow to redeposit and maintain vesting parameters', async function () {
			const tokenArgs = ['Token2', 'TKN2', 1000000, signers[0].address]
			const token = (await deployContract(
				signers[0],
				TokenArtifact,
				tokenArgs,
			)) as Token

			const amountA = 5
			const amountB = 8

			await token.approve(astranoVestingWallet.address, amountA + amountB)
			await astranoVestingWallet.deposit(token.address, amountA)

			const tokenVestingStart = await astranoVestingWallet.start(
				token.address,
			)
			const newTime = (await getTime()) + 300
			await setTime(newTime)
			await astranoVestingWallet.deposit(token.address, amountB)

			expect(
				await token.balanceOf(astranoVestingWallet.address),
			).to.equal(amountA + amountB)
			expect(await astranoVestingWallet.start(token.address)).to.equal(
				tokenVestingStart,
			)
		})
	})

	context('releasable', function () {
		let token: Token
		const depositAmount = 50

		before(async function () {
			const tokenArgs = ['Token', 'TKN', 1000000, signers[0].address]
			token = (await deployContract(
				signers[0],
				TokenArtifact,
				tokenArgs,
			)) as Token

			await token.approve(astranoVestingWallet.address, depositAmount)
			await astranoVestingWallet.deposit(token.address, depositAmount)
		})

		it('Should return (0, false) if vesting not found', async function () {
			const [releasable, finished] =
				await astranoVestingWallet.releasable(AddressZero)
			expect(releasable).to.equal(0)
			expect(finished).to.be.false
		})

		it('Should return (0, false) before vesting start', async function () {
			const tokenVestingStart = await astranoVestingWallet.start(
				token.address,
			)
			await setTime(tokenVestingStart.toNumber())

			const [releasable, finished] =
				await astranoVestingWallet.releasable(token.address)
			expect(releasable).to.equal(0)
			expect(finished).to.be.false
		})

		it('Should return (linear vesting curve, false) while vesting is active', async function () {
			const [_tokenBalance, _tokenVestingStart] = await Promise.all([
				token.balanceOf(astranoVestingWallet.address),
				astranoVestingWallet.start(token.address),
			])

			const tokenBalance = _tokenBalance.toNumber()
			const tokenVestingStart = _tokenVestingStart.toNumber()

			const newTime = tokenVestingStart + duration * 0.68
			await setTime(newTime)

			const expectedReleasable = calculateReleasable(
				tokenBalance,
				newTime,
				tokenVestingStart,
			)

			const [actualReleasable, finished] =
				await astranoVestingWallet.releasable(token.address)
			expect(actualReleasable).to.equal(expectedReleasable)
			expect(finished).to.be.false
		})

		it('Should return (token balance, true) after vesting finish', async function () {
			const tokenVestingStart = await astranoVestingWallet.start(
				token.address,
			)
			await setTime(tokenVestingStart.toNumber() + duration)

			const tokenBalance = await token.balanceOf(
				astranoVestingWallet.address,
			)
			const [releasable, finished] =
				await astranoVestingWallet.releasable(token.address)
			expect(tokenBalance).to.equal(depositAmount)
			expect(releasable).to.equal(tokenBalance)
			expect(finished).to.be.true
		})
	})

	context('release', function () {
		let token: Token

		before(async function () {
			const tokenArgs = ['Token', 'TKN', 1000000, signers[0].address]
			token = (await deployContract(
				signers[0],
				TokenArtifact,
				tokenArgs,
			)) as Token

			const amount = 50
			await token.approve(astranoVestingWallet.address, amount)
			await astranoVestingWallet.deposit(token.address, amount)
		})

		it('Should allow to release with correct parameters', async function () {
			const tokenVestingStart = await astranoVestingWallet.start(
				token.address,
			)

			const newTime = tokenVestingStart.toNumber() + duration * 0.75
			await setTime(newTime)

			const [
				_contractTokenBalance,
				_beneficiaryTokenBalance,
				_releasedBefore,
			] = await Promise.all([
				token.balanceOf(astranoVestingWallet.address),
				token.balanceOf(beneficiaryAddr()),
				astranoVestingWallet.released(token.address),
			])
			const contractTokenBalance = _contractTokenBalance.toNumber()
			const beneficiaryTokenBalance = _beneficiaryTokenBalance.toNumber()
			const releasedBefore = _releasedBefore.toNumber()

			await astranoVestingWallet.release(token.address)

			const released = calculateReleasable(
				contractTokenBalance,
				await getTime(),
				tokenVestingStart.toNumber(),
			)

			const newContractTokenBalance = await token.balanceOf(
				astranoVestingWallet.address,
			)
			const newBeneficiaryTokenBalance = await token.balanceOf(
				beneficiaryAddr(),
			)
			expect(newContractTokenBalance).to.equal(
				contractTokenBalance - released,
			)
			expect(newBeneficiaryTokenBalance).to.equal(
				beneficiaryTokenBalance + released,
			)
			expect(await astranoVestingWallet.released(token.address)).to.equal(
				releasedBefore + released,
			)
		})

		it('Should delete token vesting data after releasing if vesting has finished', async function () {
			const tokenVestingStart = await astranoVestingWallet.start(
				token.address,
			)

			expect(tokenVestingStart.toNumber()).to.be.greaterThan(0)

			await setTime(tokenVestingStart.toNumber() + duration)

			await astranoVestingWallet.release(token.address)

			expect(await astranoVestingWallet.start(token.address)).to.equal(0)
			expect(await astranoVestingWallet.released(token.address)).to.equal(
				0,
			)
		})

		it('Should not allow to release if releasable amount is 0', async function () {
			const txs = [
				astranoVestingWallet.release(AddressZero),
				astranoVestingWallet.release(token.address),
			]
			await Promise.all(
				txs.map((tx) => expectRevert(tx, 'no tokens due')),
			)
		})

		it('Should decrease releasable amount after releasing', async function () {
			const tokenArgs = ['Token2', 'TKN2', 1000, signers[0].address]
			const token = (await deployContract(
				signers[0],
				TokenArtifact,
				tokenArgs,
			)) as Token

			const amount = 200
			await token.approve(astranoVestingWallet.address, amount)
			await astranoVestingWallet.deposit(token.address, amount)

			const tokenStart = await astranoVestingWallet.start(token.address)

			const newTime = tokenStart.toNumber() + duration * 0.5
			await setTime(newTime)

			await astranoVestingWallet.release(token.address)

			const released = calculateReleasable(
				amount,
				await getTime(),
				tokenStart.toNumber(),
			)

			await setTime(tokenStart.toNumber() + duration)

			const [releasable] = await astranoVestingWallet.releasable(
				token.address,
			)
			expect(releasable).to.equal(amount - released)
		})
	})
})
