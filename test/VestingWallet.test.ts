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

describe('VestingWallet', async function () {
	let signers: SignerWithAddress[]
	let vestingWallet: VestingWallet
	let token: Token

	const beneficiary = () => signers[1]
	const beneficiaryAddr = () => beneficiary().address

	const calculateReleasable = (
		balance: number,
		time: number,
		start: number,
		duration: number,
	) => (balance * (time - start)) / duration

	before(async function () {
		signers = await getSigners()

		const tokenArgs = ['Token', 'TKN', 100_000_000, signers[0].address]
		token = (await deployContract(
			signers[0],
			TokenArtifact,
			tokenArgs,
		)) as Token
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
		it('Should allow to deposit with correct parameters', async function () {
			const amount = 10
			const startIn = 250
			const duration = 500

			await token.approve(vestingWallet.address, amount)
			await vestingWallet.deposit(
				token.address,
				amount,
				startIn,
				duration,
			)

			const time = await getTime()

			expect(await token.balanceOf(vestingWallet.address)).to.equal(
				amount,
			)
			expect(await vestingWallet.start(token.address)).to.equal(
				time + startIn,
			)
			expect(await vestingWallet.duration(token.address)).to.equal(
				duration,
			)
		})

		it('Should not allow to deposit if amount is 0', async function () {
			await expectRevert(
				vestingWallet.deposit(token.address, 0, 50, 50),
				'amount is 0',
			)
		})

		it('Should not allow to deposit if duration is 0', async function () {
			const tokenArgs = ['Token2', 'TKN2', 1000000, signers[0].address]
			const token = (await deployContract(
				signers[0],
				TokenArtifact,
				tokenArgs,
			)) as Token

			const amount = 10
			await token.approve(vestingWallet.address, amount)
			await expectRevert(
				vestingWallet.deposit(token.address, amount, 50, 0),
				'duration is 0',
			)
		})

		it('Should allow to redeposit and maintain vesting parameters', async function () {
			const tokenArgs = ['Token3', 'TKN3', 1000000, signers[0].address]
			const token = (await deployContract(
				signers[0],
				TokenArtifact,
				tokenArgs,
			)) as Token

			const amountA = 5
			const amountB = 8
			const startIn = 250
			const duration = 500

			await token.approve(vestingWallet.address, amountA + amountB)
			await vestingWallet.deposit(
				token.address,
				amountA,
				startIn,
				duration,
			)

			const tokenStart = await vestingWallet.start(token.address)
			const newTime = (await getTime()) + 300
			await setTime(newTime)
			await vestingWallet.deposit(token.address, amountB, 0, 0)

			expect(await token.balanceOf(vestingWallet.address)).to.equal(
				amountA + amountB,
			)
			expect(await vestingWallet.start(token.address)).to.equal(
				tokenStart,
			)
			expect(await vestingWallet.duration(token.address)).to.equal(
				duration,
			)
		})
	})

	context('releasable', function () {
		let token: Token
		const amount = 50
		const startIn = 500
		const duration = 750

		before(async function () {
			const tokenArgs = ['Token', 'TKN', 1000000, signers[0].address]
			token = (await deployContract(
				signers[0],
				TokenArtifact,
				tokenArgs,
			)) as Token

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
			const vestingStart = await vestingWallet.start(token.address)
			await setTime(vestingStart.toNumber())

			const [releasable, finished] = await vestingWallet.releasable(
				token.address,
			)
			expect(releasable).to.equal(0)
			expect(finished).to.be.false
		})

		it('Should return (linear vesting curve, false) while vesting is active', async function () {
			const [_tokenBalance, _vestingStart] = await Promise.all([
				token.balanceOf(vestingWallet.address),
				vestingWallet.start(token.address),
			])
			const tokenBalance = _tokenBalance.toNumber()
			const vestingStart = _vestingStart.toNumber()

			const newTime = vestingStart + duration * 0.68
			await setTime(newTime)

			const expectedReleasable = calculateReleasable(
				tokenBalance,
				newTime,
				vestingStart,
				duration,
			)

			const [actualReleasable, finished] = await vestingWallet.releasable(
				token.address,
			)
			expect(actualReleasable).to.equal(expectedReleasable)
			expect(finished).to.be.false
		})

		it('Should return (token balance, true) after vesting finish', async function () {
			const vestingStart = await vestingWallet.start(token.address)
			await setTime(vestingStart.toNumber() + duration)

			const tokenBalance = await token.balanceOf(vestingWallet.address)
			const [releasable, finished] = await vestingWallet.releasable(
				token.address,
			)
			expect(tokenBalance).to.equal(amount)
			expect(releasable).to.equal(tokenBalance)
			expect(finished).to.be.true
		})
	})

	context('release', function () {
		const amount = 2500
		const startIn = 7500
		const duration = 10000

		before(async function () {
			await token.approve(vestingWallet.address, amount)
			await vestingWallet.deposit(
				token.address,
				amount,
				startIn,
				duration,
			)
		})

		it('Should allow to release with correct parameters', async function () {
			const vestingStart = await vestingWallet.start(token.address)

			const newTime = vestingStart.toNumber() + duration * 0.75
			console.log({ newTime })
			await setTime(newTime)

			const [
				_contractTokenBalance,
				_beneficiaryTokenBalance,
				_releasedBefore,
			] = await Promise.all([
				token.balanceOf(vestingWallet.address),
				token.balanceOf(beneficiaryAddr()),
				vestingWallet.released(token.address),
			])
			console.log({
				_contractTokenBalance,
				_beneficiaryTokenBalance,
				_releasedBefore,
			})
			const contractTokenBalance = _contractTokenBalance.toNumber()
			const beneficiaryTokenBalance = _beneficiaryTokenBalance.toNumber()
			const releasedBefore = _releasedBefore.toNumber()

			await vestingWallet.release(token.address)

			const released = calculateReleasable(
				contractTokenBalance,
				await getTime(),
				vestingStart.toNumber(),
				duration,
			)
			console.log({ released })

			const newContractTokenBalance = await token.balanceOf(
				vestingWallet.address,
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
			expect(await vestingWallet.released(token.address)).to.equal(
				releasedBefore + released,
			)
		})

		it('Should delete token vesting data after releasing if vesting has finished', async function () {
			const vestingStart = await vestingWallet.start(token.address)
			expect(vestingStart.toNumber()).to.be.greaterThan(0)

			await setTime(vestingStart.toNumber() + duration)

			await vestingWallet.release(token.address)
			expect(await vestingWallet.start(token.address)).to.equal(0)
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
			const tokenArgs = ['Token2', 'TKN2', 1_000_000, signers[0].address]
			const token = (await deployContract(
				signers[0],
				TokenArtifact,
				tokenArgs,
			)) as Token

			const amount = 200
			await token.approve(vestingWallet.address, amount)
			await vestingWallet.deposit(
				token.address,
				amount,
				startIn,
				duration,
			)

			const vestingStart = await vestingWallet.start(token.address)
			const newTime = vestingStart.toNumber() + duration * 0.5
			await setTime(newTime)
			await vestingWallet.release(token.address)

			const released = calculateReleasable(
				amount,
				await getTime(),
				vestingStart.toNumber(),
				duration,
			)

			await setTime(vestingStart.toNumber() + duration)
			const [releasable] = await vestingWallet.releasable(token.address)
			expect(releasable).to.equal(amount - released)
		})
	})
})
