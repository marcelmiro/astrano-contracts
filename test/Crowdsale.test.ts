import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

/* eslint-disable node/no-missing-import */
import { expectRevert, getTime, setTime } from '../src/helpers'

import CrowdsaleArtifact from '../artifacts/contracts/Crowdsale.sol/Crowdsale.json'
import TokenArtifact from '../artifacts/contracts/Token.sol/Token.json'
import { Crowdsale } from '../src/types/Crowdsale'
import { Token } from '../src/types/Token'
/* eslint-enable node/no-missing-import */

const {
	getSigners,
	constants: { AddressZero },
} = ethers
const { deployContract } = waffle

describe('Crowdsale', function () {
	let signers: SignerWithAddress[]
	let crowdsale: Crowdsale
	let token: Token
	let pairToken: Token

	const owner = () => signers[10]
	const finalizer = () => signers[11]

	const crowdsaleArgs = async ({
		tokenAddress = token.address,
		pairTokenAddress = pairToken.address,
		ownerAddress = '',
		finalizerAddress = '',
		rate = 100,
		cap = 10_000,
		individualCap = 5000,
		minPurchaseAmount = 10,
		goal = 8000,
		openingTime = 0,
		closingTime = 0,
	} = {}) => {
		const time = await getTime()
		ownerAddress ||= owner().address
		finalizerAddress ||= finalizer().address
		openingTime ||= time + 1800
		closingTime ||= openingTime + 3600
		return [
			tokenAddress,
			pairTokenAddress,
			ownerAddress,
			finalizerAddress,
			rate,
			cap,
			individualCap,
			minPurchaseAmount,
			goal,
			openingTime,
			closingTime,
		]
	}

	before(async function () {
		signers = await getSigners()

		const tokenArgs = ['Token', 'TKN', 100_000_000, signers[0].address]
		const pairTokenArgs = [
			'Pair Token',
			'PTKN',
			100_000_000,
			signers[0].address,
		]

		;[token, pairToken] = (await Promise.all([
			deployContract(signers[0], TokenArtifact, tokenArgs),
			deployContract(signers[0], TokenArtifact, pairTokenArgs),
		])) as [Token, Token]
	})

	it('Should create contract with correct parameters', async function () {
		const time = await getTime()
		const rate = 10
		const cap = 10_000
		const individualCap = 5000
		const minPurchaseAmount = 10
		const goal = 8000
		const openingTime = time + 600
		const closingTime = openingTime + 3600

		const args = await crowdsaleArgs({
			rate,
			cap,
			individualCap,
			minPurchaseAmount,
			goal,
			openingTime,
			closingTime,
		})

		crowdsale = (await deployContract(
			signers[0],
			CrowdsaleArtifact,
			args,
		)) as Crowdsale

		const [
			_token,
			_pairToken,
			_rate,
			_cap,
			_individualCap,
			_minPurchaseAmount,
			_goal,
			_openingTime,
			_closingTime,
		] = await Promise.all([
			crowdsale.token(),
			crowdsale.pairToken(),
			crowdsale.rate(),
			crowdsale.cap(),
			crowdsale.individualCap(),
			crowdsale.minPurchaseAmount(),
			crowdsale.goal(),
			crowdsale.openingTime(),
			crowdsale.closingTime(),
		])

		expect(_token).to.equal(token.address)
		expect(_pairToken).to.equal(pairToken.address)
		expect(_rate).to.equal(rate)
		expect(_cap).to.equal(cap)
		expect(_individualCap).to.equal(individualCap)
		expect(_minPurchaseAmount).to.equal(minPurchaseAmount)
		expect(_goal).to.equal(goal)
		expect(_openingTime).to.equal(openingTime)
		expect(_closingTime).to.equal(closingTime)
	})

	it('Should revert on create contract with incorrect parameters', async function () {
		const time = await getTime()
		const deploys = [
			{
				args: { tokenAddress: AddressZero },
				message: 'token is the zero address',
			},
			{
				args: { pairTokenAddress: AddressZero },
				message: 'pair token is the zero address',
			},
			{
				args: { ownerAddress: AddressZero },
				message: 'owner is the zero address',
			},
			{
				args: { finalizerAddress: AddressZero },
				message: 'finalizer is the zero address',
			},
			{
				args: { rate: 0 },
				message: 'rate is 0',
			},
			{
				args: { cap: 0 },
				message: 'cap is 0',
			},
			{
				args: { cap: 10, goal: 11 },
				message: 'goal is greater than cap',
			},
			{
				args: { cap: 10, goal: 9, rate: 11 },
				message: 'rate is greater than cap',
			},
			{
				args: { openingTime: time - 1 },
				message: 'opening before current time',
			},
			{
				args: {
					openingTime: time + 600,
					closingTime: time + 600,
				},
				message: 'closing not after opening time',
			},
		]

		await Promise.all(
			deploys.map(async ({ args, message }) =>
				expectRevert(
					deployContract(
						signers[0],
						CrowdsaleArtifact,
						await crowdsaleArgs(args),
					),
					message,
				),
			),
		)
	})

	context('buy', function () {
		before(async function () {
			const cap = await crowdsale.cap()
			await token.transfer(crowdsale.address, cap)
		})

		it('Should allow purchase during opening and closing times', async function () {
			const buyer = signers[0]
			const openingTime = await crowdsale.openingTime()
			await setTime(openingTime.toNumber())

			const [beforeBuyerBalance, beforeCrowdsaleBalance] =
				await Promise.all([
					pairToken.balanceOf(buyer.address),
					pairToken.balanceOf(crowdsale.address),
				])

			const amount = 250
			await pairToken.connect(buyer).approve(crowdsale.address, amount)
			await crowdsale.buy(buyer.address, amount)

			const [
				afterBuyerBalance,
				afterCrowdsaleBalance,
				crowdsaleBuyerBalance,
				tokensSold,
				contributors,
				rate,
			] = await Promise.all([
				pairToken.balanceOf(buyer.address),
				pairToken.balanceOf(crowdsale.address),
				crowdsale.balanceOf(buyer.address),
				crowdsale.tokensSold(),
				crowdsale.contributors(),
				crowdsale.rate(),
			])

			const tokenAmount = rate.mul(amount)
			expect(afterBuyerBalance).to.equal(beforeBuyerBalance.sub(amount))
			expect(afterCrowdsaleBalance).to.equal(
				beforeCrowdsaleBalance.add(amount),
			)
			expect(crowdsaleBuyerBalance).to.equal(tokenAmount)
			expect(tokensSold).to.equal(tokenAmount)
			expect(contributors).to.equal(1)
		})

		it('Should revert purchase with incorrect parameters', async function () {
			await Promise.all([
				expectRevert(
					crowdsale.buy(AddressZero, 10),
					'beneficiary is the zero address',
				),
				expectRevert(
					crowdsale.buy(signers[0].address, 0),
					'amount is 0',
				),
			])
		})

		it('Should revert purchase before opening time', async function () {
			const crowdsale = (await deployContract(
				signers[0],
				CrowdsaleArtifact,
				await crowdsaleArgs(),
			)) as Crowdsale

			await expectRevert(
				crowdsale.buy(signers[0].address, 50),
				'crowdsale not open',
			)
		})

		it('Should revert purchase after closing time', async function () {
			const crowdsale = (await deployContract(
				signers[0],
				CrowdsaleArtifact,
				await crowdsaleArgs(),
			)) as Crowdsale

			const closingTime = await crowdsale.closingTime()
			await setTime(closingTime.toNumber())
			await expectRevert(
				crowdsale.buy(signers[0].address, 50),
				'crowdsale not open',
			)
		})

		it('Should revert purchase over cap', async function () {
			const rate = 1
			const cap = 100
			const args = await crowdsaleArgs({
				rate,
				cap,
				individualCap: cap + 10,
				goal: cap,
				minPurchaseAmount: 1,
			})

			const crowdsale = (await deployContract(
				signers[0],
				CrowdsaleArtifact,
				args,
			)) as Crowdsale

			await token.transfer(crowdsale.address, cap)
			const openingTime = await crowdsale.openingTime()
			await setTime(openingTime.toNumber())

			const amount = cap / rate
			const amountA = Math.floor(amount * 0.9)
			const amountB = amount - amountA
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amountA)

			await expectRevert(
				crowdsale.buy(signers[0].address, amountB + 1),
				'cap exceeded',
			)

			await crowdsale.buy(signers[0].address, amountB)
			await expectRevert(
				crowdsale.buy(signers[0].address, 1),
				'crowdsale not open',
			)
		})

		it('Should revert purchase over individual cap', async function () {
			const individualCap = 100
			const crowdsale = await deployContract(
				signers[0],
				CrowdsaleArtifact,
				await crowdsaleArgs({ individualCap }),
			)

			const openingTime = await crowdsale.openingTime()
			await setTime(openingTime.toNumber())

			await expectRevert(
				crowdsale.buy(signers[0].address, individualCap + 1),
				"beneficiary's cap exceeded",
			)
		})

		it('Should revert purchase under minimum amount', async function () {
			const crowdsale = await deployContract(
				signers[0],
				CrowdsaleArtifact,
				await crowdsaleArgs({ minPurchaseAmount: 2 }),
			)

			const openingTime = await crowdsale.openingTime()
			await setTime(openingTime.toNumber())

			await expectRevert(
				crowdsale.buy(signers[0].address, 1),
				'amount less than minimum amount',
			)
		})

		it("Should revert purchase if contract doesn't have enough tokens to sell", async function () {
			const rate = 1
			const cap = 120
			const args = await crowdsaleArgs({
				rate,
				cap,
				individualCap: cap,
				goal: cap,
				minPurchaseAmount: 1,
			})
			const crowdsale = (await deployContract(
				signers[0],
				CrowdsaleArtifact,
				args,
			)) as Crowdsale

			const amount = Math.floor((cap * 0.5) / rate)
			await token.transfer(crowdsale.address, amount)
			const openingTime = await crowdsale.openingTime()
			await setTime(openingTime.toNumber())

			await pairToken.approve(crowdsale.address, amount + 1)
			await expectRevert(
				crowdsale.buy(signers[0].address, amount + 1),
				'insufficient balance',
			)
		})
	})

	context('finalize', function () {
		let crowdsale: Crowdsale
		const rate = 2
		const cap = 1000
		const goal = 500

		beforeEach(async function () {
			const args = await crowdsaleArgs({
				rate,
				cap,
				goal,
				individualCap: cap,
				minPurchaseAmount: 1,
			})
			crowdsale = (await deployContract(
				signers[0],
				CrowdsaleArtifact,
				args,
			)) as Crowdsale
			await token.transfer(crowdsale.address, cap)
		})

		it('Should allow to finalize after closing time if goal reached', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(goal / rate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			await setTime(closingTime.toNumber())
			await crowdsale.connect(finalizer()).finalize()
		})

		it('Should allow to finalize during opening and closing times if cap reached', async function () {
			const openingTime = await crowdsale.openingTime()
			await setTime(openingTime.toNumber())

			const amount = Math.floor(cap / rate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			await crowdsale.connect(finalizer()).finalize()
		})

		it('Should revert finalize if caller not finalizer', async function () {
			await expectRevert(crowdsale.finalize(), 'caller not finalizer')
		})

		it('Should revert finalize if already finalized', async function () {
			const openingTime = await crowdsale.openingTime()
			await setTime(openingTime.toNumber())

			const amount = Math.floor(cap / rate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			await crowdsale.connect(finalizer()).finalize()
			await expectRevert(
				crowdsale.connect(finalizer()).finalize(),
				'already finalized',
			)
		})

		it('Should revert finalize before opening time', async function () {
			await expectRevert(
				crowdsale.connect(finalizer()).finalize(),
				'crowdsale not closed',
			)
		})

		it('Should revert finalize during opening and closing times if cap not reached', async function () {
			const openingTime = await crowdsale.openingTime()
			await setTime(openingTime.toNumber())

			const amount = Math.floor(cap / rate) - 1
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			await expectRevert(
				crowdsale.connect(finalizer()).finalize(),
				'crowdsale not closed',
			)
		})

		it('Should revert finalize after closing time if goal not reached', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(goal / rate) - 1
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			await setTime(closingTime.toNumber())
			await expectRevert(
				crowdsale.connect(finalizer()).finalize(),
				'goal not reached',
			)
		})

		it('Should revert finalize after 30 days after closing times', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(cap / rate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			const TIME_30_DAYS = 60 * 60 * 24 * 30
			await setTime(closingTime.add(TIME_30_DAYS).toNumber())

			await expectRevert(
				crowdsale.connect(finalizer()).finalize(),
				'time to finalize has expired',
			)
		})

		it('Should approve pair token balance to be spent by finalizer on finalize', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(goal / rate + ((cap - goal) / rate) * 0.4)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			await setTime(closingTime.add(1).toNumber())
			const pairTokenAmount = await crowdsale
				.connect(finalizer())
				.callStatic.finalize()
			await crowdsale.connect(finalizer()).finalize()

			const allowance = await pairToken.allowance(
				crowdsale.address,
				finalizer().address,
			)
			expect(allowance).to.equal(amount)
			expect(allowance).to.equal(pairTokenAmount)
		})

		it('Should transfer unsold tokens to finalizer', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(goal / rate + ((cap - goal) / rate) * 0.4)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			const beforeFinalizerBalance = await token.balanceOf(
				finalizer().address,
			)

			await setTime(closingTime.toNumber())
			await crowdsale.connect(finalizer()).finalize()

			const [afterCrowdsaleBalance, afterFinalizerBalance] =
				await Promise.all([
					token.balanceOf(crowdsale.address),
					token.balanceOf(finalizer().address),
				])

			expect(afterCrowdsaleBalance).to.equal(amount * rate)
			expect(afterFinalizerBalance).to.equal(
				beforeFinalizerBalance.add(cap - amount * rate),
			)
		})
	})

	context('withdraw', function () {
		let crowdsale: Crowdsale
		const rate = 2
		const cap = 1000
		const goal = 500

		beforeEach(async function () {
			const args = await crowdsaleArgs({
				rate,
				cap,
				goal,
				individualCap: cap,
				minPurchaseAmount: 1,
			})
			crowdsale = (await deployContract(
				signers[0],
				CrowdsaleArtifact,
				args,
			)) as Crowdsale
			await token.transfer(crowdsale.address, cap)
		})

		it('Should allow to withdraw if finalized', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(goal / rate + ((cap - goal) / rate) * 0.4)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			await setTime(closingTime.toNumber())
			await crowdsale.connect(finalizer()).finalize()

			const [beforeBuyerBalance, beforeBuyerContribution] =
				await Promise.all([
					token.balanceOf(signers[0].address),
					crowdsale.balanceOf(signers[0].address),
				])

			expect(beforeBuyerContribution).to.equal(amount * rate)

			await crowdsale.withdraw(signers[0].address)

			const [afterBuyerBalance, afterBuyerContribution] =
				await Promise.all([
					token.balanceOf(signers[0].address),
					crowdsale.balanceOf(signers[0].address),
				])

			expect(afterBuyerBalance).to.equal(
				beforeBuyerBalance.add(amount * rate),
			)
			expect(afterBuyerContribution).to.equal(0)
		})

		it('Should revert withdraw if not finalized', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(goal / rate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			await setTime(closingTime.toNumber())

			await expectRevert(
				crowdsale.withdraw(signers[0].address),
				'crowdsale not finalized',
			)
		})

		it('Should reject withdraw if no balance', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(goal / rate + ((cap - goal) / rate) * 0.4)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			await setTime(closingTime.toNumber())
			await crowdsale.connect(finalizer()).finalize()

			await expectRevert(
				crowdsale.withdraw(signers[1].address),
				'beneficiary not due any tokens',
			)
		})
	})

	context('refund', function () {
		let crowdsale: Crowdsale
		const rate = 2
		const cap = 1000
		const goal = 500

		beforeEach(async function () {
			const args = await crowdsaleArgs({
				rate,
				cap,
				goal,
				individualCap: cap,
				minPurchaseAmount: 1,
			})
			crowdsale = (await deployContract(
				signers[0],
				CrowdsaleArtifact,
				args,
			)) as Crowdsale
			await token.transfer(crowdsale.address, cap)
		})

		it('Should allow refund after closing time if goal not reached', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(goal / rate) - 1
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			const beforeBuyerBalance = await pairToken.balanceOf(
				signers[0].address,
			)

			await setTime(closingTime.toNumber())
			await crowdsale.refund(signers[0].address)

			const [
				afterBuyerContribution,
				afterCrowdsaleBalance,
				afterBuyerBalance,
			] = await Promise.all([
				crowdsale.balanceOf(signers[0].address),
				pairToken.balanceOf(crowdsale.address),
				pairToken.balanceOf(signers[0].address),
			])

			expect(afterBuyerContribution).to.equal(0)
			expect(afterCrowdsaleBalance).to.equal(0)
			expect(afterBuyerBalance).to.equal(beforeBuyerBalance.add(amount))
		})

		it('Should allow refund after 30 days after closing time', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(goal / rate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			const TIME_30_DAYS = 60 * 60 * 24 * 30
			await setTime(closingTime.add(TIME_30_DAYS).toNumber())
			await crowdsale.refund(signers[0].address)
		})

		it('Should revert refund if no balance', async function () {
			const closingTime = await crowdsale.closingTime()
			await setTime(closingTime.toNumber())
			await expectRevert(
				crowdsale.refund(signers[0].address),
				'beneficiary not due any tokens',
			)
		})

		it('Should revert refund if finalized', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(goal / rate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			await setTime(closingTime.toNumber())
			await crowdsale.connect(finalizer()).finalize()

			await expectRevert(
				crowdsale.refund(signers[0].address),
				'refunds not due',
			)

			const TIME_30_DAYS = 60 * 60 * 24 * 30
			await setTime(closingTime.add(TIME_30_DAYS).toNumber())
			await expectRevert(
				crowdsale.refund(signers[0].address),
				'refunds not due',
			)
		})

		it('Should revert refund before closing time if goal not reached', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(goal / rate) - 1
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			await setTime(closingTime.toNumber() - 1)
			await expectRevert(
				crowdsale.refund(signers[0].address),
				'refunds not due',
			)
		})

		it('Should revert refund before 30 days after closing time if goal reached', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(goal / rate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			const TIME_30_DAYS = 60 * 60 * 24 * 30 - 1
			await setTime(closingTime.add(TIME_30_DAYS).toNumber())
			await expectRevert(
				crowdsale.refund(signers[0].address),
				'refunds not due',
			)
		})
	})

	context('withdrawExpiredTokens', function () {
		let crowdsale: Crowdsale
		const rate = 2
		const cap = 1000
		const goal = 500

		beforeEach(async function () {
			const args = await crowdsaleArgs({
				rate,
				cap,
				goal,
				individualCap: cap,
				minPurchaseAmount: 1,
			})
			crowdsale = (await deployContract(
				signers[0],
				CrowdsaleArtifact,
				args,
			)) as Crowdsale
			await token.transfer(crowdsale.address, cap)
		})

		it('Should allow to withdraw expired tokens after closing time if goal not reached', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(goal / rate) - 1
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			const [beforeCrowdsaleBalance, beforeOwnerBalance] =
				await Promise.all([
					token.balanceOf(crowdsale.address),
					token.balanceOf(owner().address),
				])

			await setTime(closingTime.toNumber())
			await crowdsale.withdrawExpiredTokens()

			const [afterCrowdsaleBalance, afterOwnerBalance] =
				await Promise.all([
					token.balanceOf(crowdsale.address),
					token.balanceOf(owner().address),
				])

			expect(afterCrowdsaleBalance).to.equal(0)
			expect(afterOwnerBalance).to.equal(
				beforeOwnerBalance.add(beforeCrowdsaleBalance),
			)
		})

		it('Should allow to withdraw expired tokens after 30 days after closing time', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(goal / rate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			const TIME_30_DAYS = 60 * 60 * 24 * 30
			await setTime(closingTime.add(TIME_30_DAYS).toNumber())
			await crowdsale.withdrawExpiredTokens()
		})

		it('Should revert withdrawExpiredTokens if finalized', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(goal / rate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			await setTime(closingTime.toNumber())
			await crowdsale.connect(finalizer()).finalize()

			await expectRevert(
				crowdsale.withdrawExpiredTokens(),
				'crowdsale not expired',
			)

			const TIME_30_DAYS = 60 * 60 * 24 * 30
			await setTime(closingTime.add(TIME_30_DAYS).toNumber())
			await expectRevert(
				crowdsale.withdrawExpiredTokens(),
				'crowdsale not expired',
			)
		})

		it('Should revert withdrawExpiredTokens before closing time if goal not reached', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(goal / rate) - 1
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			await setTime(closingTime.toNumber() - 1)
			await expectRevert(
				crowdsale.withdrawExpiredTokens(),
				'crowdsale not expired',
			)
		})

		it('Should revert withdrawExpiredTokens before 30 days after closing time if goal reached', async function () {
			const [openingTime, closingTime] = await Promise.all([
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])
			await setTime(openingTime.toNumber())

			const amount = Math.floor(goal / rate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			const TIME_30_DAYS = 60 * 60 * 24 * 30 - 1
			await setTime(closingTime.add(TIME_30_DAYS).toNumber())
			await expectRevert(
				crowdsale.withdrawExpiredTokens(),
				'crowdsale not expired',
			)
		})
	})
})
