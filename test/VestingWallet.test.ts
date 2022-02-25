import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

/* eslint-disable node/no-missing-import */
import { expectRevert, getTime, setTime } from '../src/helpers'

import VestingWalletArtifact from '../artifacts/contracts/VestingWallet.sol/VestingWallet.json'
import TokenArtifact from '../artifacts/contracts/Token.sol/Token.json'
import { VestingWallet } from '../src/types/VestingWallet'
import { Token } from '../src/types/Token'
/* eslint-enable node/no-missing-import */

const {
	getSigners,
	constants: { AddressZero },
} = ethers
const { deployContract } = waffle

const createToken = (signer: SignerWithAddress, supply = 1_000_000) => {
	const tokenArgs = ['Token', 'TKN', supply, signer.address]
	return deployContract(signer, TokenArtifact, tokenArgs) as Promise<Token>
}

describe('VestingWallet', async function () {
	let signers: SignerWithAddress[]
	let vestingWallet: VestingWallet

	const beneficiary = () => signers[1]
	const beneficiaryAddr = () => beneficiary().address

	const calculateReleasable = (
		balance: number,
		time: number,
		start: number,
		duration: number,
	) => Math.floor((balance * (time - start)) / duration)

	before(async function () {
		signers = await getSigners()
	})

	it('Should create contract with correct parameters', async function () {
		vestingWallet = (await deployContract(
			signers[0],
			VestingWalletArtifact,
			[beneficiaryAddr()],
		)) as VestingWallet

		expect(await vestingWallet.beneficiary()).to.equal(beneficiaryAddr())
	})

	it('Should revert on create contract with incorrect parameters', async function () {
		const deployBeneficiaryAddressZero = deployContract(
			signers[0],
			VestingWalletArtifact,
			[AddressZero],
		)

		await expectRevert(
			deployBeneficiaryAddressZero,
			'beneficiary is the zero address',
		)
	})

	context('deposit', function () {
		let token: Token

		before(async function () {
			token = await createToken(signers[0], 100_000_000)
		})

		it('Should allow to deposit with correct parameters', async function () {
			const amount = 1000
			const startIn = 2500
			const duration = 5000

			await token.approve(vestingWallet.address, amount)
			await vestingWallet.deposit(
				token.address,
				amount,
				startIn,
				duration,
			)

			const [time, actualAmount, actualStart, actualDuration] =
				await Promise.all([
					getTime(),
					token.balanceOf(vestingWallet.address),
					vestingWallet.start(token.address),
					vestingWallet.duration(token.address),
				])

			expect(actualAmount).to.equal(amount)
			expect(actualStart).to.equal(time + startIn)
			expect(actualDuration).to.equal(duration)
		})

		it('Should not allow to deposit if amount is 0', async function () {
			await expectRevert(
				vestingWallet.deposit(token.address, 0, 50, 50),
				'amount is 0',
			)
		})

		it('Should not allow to deposit if duration is 0', async function () {
			const token = await createToken(signers[0], 1_000_000)

			const amount = 500
			await token.approve(vestingWallet.address, amount)
			await expectRevert(
				vestingWallet.deposit(token.address, amount, 50, 0),
				'duration is 0',
			)
		})

		it('Should allow to redeposit and maintain vesting parameters', async function () {
			const _start = await vestingWallet.start(token.address)
			if (_start.eq(0)) {
				const amount = 750
				await token.approve(vestingWallet.address, amount)
				await vestingWallet.deposit(token.address, amount, 1000, 2500)
			}

			const amount = 1250
			const [start, duration] = await Promise.all([
				vestingWallet.start(token.address),
				vestingWallet.duration(token.address),
			])

			await setTime(start.toNumber() + duration.toNumber() * 0.5)

			await token.approve(vestingWallet.address, amount)
			await vestingWallet.deposit(token.address, amount, 0, 0)

			const [startAfterDeposit, durationAfterDeposit] = await Promise.all(
				[
					vestingWallet.start(token.address),
					vestingWallet.duration(token.address),
				],
			)

			expect(startAfterDeposit).to.equal(start)
			expect(durationAfterDeposit).to.equal(duration)
		})
	})

	context('releasable', function () {
		let token: Token
		const amount = 800
		const startIn = 5000
		const duration = 7500

		before(async function () {
			token = await createToken(signers[0], 1_000_000)

			await token.approve(vestingWallet.address, amount)
			await vestingWallet.deposit(
				token.address,
				amount,
				startIn,
				duration,
			)
		})

		it('Should return (0, false) if vesting not found', async function () {
			const [releasable, finished] = await vestingWallet.releasable(
				AddressZero,
			)
			expect(releasable).to.equal(0)
			expect(finished).to.be.false
		})

		it('Should return (0, false) before vesting start', async function () {
			const start = await vestingWallet.start(token.address)
			await setTime(start.toNumber())
			const [releasable, finished] = await vestingWallet.releasable(
				token.address,
			)
			expect(releasable).to.equal(0)
			expect(finished).to.be.false
		})

		it('Should return (linear vesting curve, false) while vesting is active', async function () {
			const [_balance, _start] = await Promise.all([
				token.balanceOf(vestingWallet.address),
				vestingWallet.start(token.address),
			])
			const balance = _balance.toNumber()
			const start = _start.toNumber()

			const newTime = start + duration * 0.68
			await setTime(newTime)

			const expectedReleasable = calculateReleasable(
				balance,
				newTime,
				start,
				duration,
			)

			const [actualReleasable, finished] = await vestingWallet.releasable(
				token.address,
			)
			expect(actualReleasable).to.equal(expectedReleasable)
			expect(finished).to.be.false
		})

		it('Should return (token balance, true) after vesting finish', async function () {
			const start = await vestingWallet.start(token.address)
			await setTime(start.toNumber() + duration)
			const balance = await token.balanceOf(vestingWallet.address)
			const [releasable, finished] = await vestingWallet.releasable(
				token.address,
			)
			expect(balance).to.equal(amount)
			expect(releasable).to.equal(balance)
			expect(finished).to.be.true
		})
	})

	context('release', function () {
		let token: Token

		before(async function () {
			token = await createToken(signers[0], 1_000_000)

			const amount = 2500
			const startIn = 7500
			const duration = 10000

			await token.approve(vestingWallet.address, amount)
			await vestingWallet.deposit(
				token.address,
				amount,
				startIn,
				duration,
			)
		})

		it('Should allow to release with correct parameters', async function () {
			const [start, duration] = await Promise.all([
				vestingWallet.start(token.address),
				vestingWallet.duration(token.address),
			])

			const newTime = Math.floor(
				start.toNumber() + duration.toNumber() * 0.8,
			)
			await setTime(newTime)

			const [_contractBalance, _beneficiaryBalance, _releasedBefore] =
				await Promise.all([
					token.balanceOf(vestingWallet.address),
					token.balanceOf(beneficiaryAddr()),
					vestingWallet.released(token.address),
				])
			const contractBalance = _contractBalance.toNumber()
			const beneficiaryBalance = _beneficiaryBalance.toNumber()
			const releasedBefore = _releasedBefore.toNumber()

			await vestingWallet.release(token.address)
			const released = calculateReleasable(
				contractBalance,
				await getTime(),
				start.toNumber(),
				duration.toNumber(),
			)

			const [
				newContractBalance,
				newBeneficiaryBalance,
				expectedReleased,
			] = await Promise.all([
				token.balanceOf(vestingWallet.address),
				token.balanceOf(beneficiaryAddr()),
				vestingWallet.released(token.address),
			])

			expect(newContractBalance).to.equal(contractBalance - released)
			expect(newBeneficiaryBalance).to.equal(
				beneficiaryBalance + released,
			)
			expect(expectedReleased).to.equal(releasedBefore + released)
		})

		it('Should delete token vesting data after releasing if vesting has finished', async function () {
			const [start, duration] = await Promise.all([
				vestingWallet.start(token.address),
				vestingWallet.duration(token.address),
			])

			expect(start.toNumber()).to.be.greaterThan(0)
			await setTime(start.add(duration).toNumber())

			await vestingWallet.release(token.address)
			expect(await vestingWallet.start(token.address)).to.equal(0)
			expect(await vestingWallet.duration(token.address)).to.equal(0)
			expect(await vestingWallet.released(token.address)).to.equal(0)
		})

		it('Should not allow to release if releasable amount is 0', async function () {
			const txs = [
				vestingWallet.release(AddressZero),
				vestingWallet.release(token.address),
			]
			await Promise.all(
				txs.map((tx) => expectRevert(tx, 'no tokens due')),
			)
		})

		it('Should decrease releasable amount after releasing', async function () {
			const amount = 200
			const _startIn = 500
			const _duration = 1500

			await token.approve(vestingWallet.address, amount)
			await vestingWallet.deposit(
				token.address,
				amount,
				_startIn,
				_duration,
			)

			const [start, duration, contractBalance] = await Promise.all([
				vestingWallet.start(token.address),
				vestingWallet.duration(token.address),
				token.balanceOf(vestingWallet.address),
			])

			const newTime = start.toNumber() + duration.toNumber() * 0.85
			await setTime(newTime)

			await vestingWallet.release(token.address)
			const released = calculateReleasable(
				contractBalance.toNumber(),
				await getTime(),
				start.toNumber(),
				duration.toNumber(),
			)

			await setTime(start.add(duration).toNumber())
			const [releasable] = await vestingWallet.releasable(token.address)
			expect(releasable).to.equal(contractBalance.sub(released))
		})
	})
})
