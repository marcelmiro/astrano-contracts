/* eslint-disable node/no-missing-import */
import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'

import { expectRevert, getTime, setTime } from '../src/helpers'
import TokenArtifact from '../artifacts/contracts/Token.sol/Token.json'
import { Token } from '../src/types/Token'
import CrowdsaleArtifact from '../artifacts/contracts/Crowdsale.sol/Crowdsale.json'
import { Crowdsale } from '../src/types/Crowdsale'

import '../src/types/Crowdsale'

const {
	getSigners,
	constants: { AddressZero },
} = ethers
const { deployContract } = waffle

describe('Crowdsale', function () {
	let token: Token
	let pairToken: Token
	let crowdsale: Crowdsale
	let signers: SignerWithAddress[]

	const crowdsaleData = {
		rate: 1,
		cap: 100,
		individualCap: 60,
		minPurchaseAmount: 2,
		goal: 50,
	}

	const generateContract = async (
		params = {},
		transferAmount?: number | BigNumber,
	) => {
		signers = await getSigners()

		const tokenData = ['My Custom Token', 'MCT', 1000]

		token = (await deployContract(
			signers[0],
			TokenArtifact,
			tokenData,
		)) as Token

		// USDT-like token
		const pairTokenData = ['Tether', 'USDT', 1000000000]

		pairToken = (await deployContract(
			signers[0],
			TokenArtifact,
			pairTokenData,
		)) as Token

		const now = await getTime()

		const newData = {
			...crowdsaleData,
			openingTime: now + 120, // in 2 minutes
			closingTime: now + 240, // in 4 minutes
			token: token.address,
			pairToken: pairToken.address,
			...params,
		}

		const args = [
			newData.token,
			newData.pairToken,
			newData.rate,
			newData.cap,
			newData.individualCap,
			newData.minPurchaseAmount,
			newData.goal,
			newData.openingTime,
			newData.closingTime,
		]

		crowdsale = (await deployContract(
			signers[0],
			CrowdsaleArtifact,
			args,
		)) as Crowdsale

		if (transferAmount || transferAmount === 0) {
			const bigNumber = BigNumber.isBigNumber(transferAmount)
				? transferAmount
				: BigNumber.from(transferAmount)

			if (bigNumber.gt(0)) token.transfer(crowdsale.address, bigNumber)
		}

		return newData
	}

	it('Should create crowdsale with correct parameters', async function () {
		const { openingTime, closingTime } = await generateContract()

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

		expect(_token.toLowerCase()).to.equal(token.address.toLowerCase())
		expect(_pairToken.toLowerCase()).to.equal(
			pairToken.address.toLowerCase(),
		)
		expect(_rate).to.equal(crowdsaleData.rate)
		expect(_cap).to.equal(crowdsaleData.cap)
		expect(_individualCap).to.equal(crowdsaleData.individualCap)
		expect(_minPurchaseAmount).to.equal(crowdsaleData.minPurchaseAmount)
		expect(_goal).to.equal(crowdsaleData.goal)
		expect(_openingTime).to.equal(openingTime)
		expect(_closingTime).to.equal(closingTime)
	})

	it('Should throw on zero address sent as token address', async function () {
		const data = [
			{
				params: { token: AddressZero },
				error: 'Crowdsale: token address is the zero address',
			},
			{
				params: { pairToken: AddressZero },
				error: 'Crowdsale: pair token address is the zero address',
			},
		]

		for (const { params, error } of data)
			await expectRevert(generateContract(params), error)
	})

	it('Should throw on zero rate and cap', async function () {
		const data = [
			{
				params: { rate: 0 },
				error: 'Crowdsale: rate is 0',
			},
			{
				params: { cap: 0 },
				error: 'Crowdsale: cap is 0',
			},
		]

		for (const { params, error } of data)
			await expectRevert(generateContract(params), error)
	})

	it('Should throw if goal is greater than cap', async function () {
		await expectRevert(
			generateContract({ goal: 1000, cap: 100 }),
			'Crowdsale: goal is greater than cap',
		)
	})

	it('Should allow zero as individualCap and minPurchaseAmount', async function () {
		const data = [
			{ params: { individualCap: 0 } },
			{ params: { minPurchaseAmount: 0 } },
		]

		for (const { params } of data) await generateContract(params)
	})

	it('Should throw on invalid opening and closing dates', async function () {
		const now = await getTime()

		const data = [
			{
				params: { openingTime: 0 },
				error: 'Crowdsale: opening time is before current time',
			},
			{
				params: { openingTime: now - 100 },
				error: 'Crowdsale: opening time is before current time',
			},
			{
				params: { closingTime: 0 },
				error: 'Crowdsale: opening time is not before closing time',
			},
			{
				params: { openingTime: now + 100, closingTime: now + 50 },
				error: 'Crowdsale: opening time is not before closing time',
			},
			{
				params: { openingTime: now + 100, closingTime: now + 100 },
				error: 'Crowdsale: opening time is not before closing time',
			},
		]

		for (const { params, error } of data)
			await expectRevert(generateContract(params), error)
	})

	context('Once deployed', function () {
		type Data = {
			openingTime: number
			closingTime: number
			[key: string]: unknown
		}

		const data: Data = { openingTime: 0, closingTime: 0, goal: 0 }

		beforeEach(async () => {
			const now = await getTime()

			data.openingTime = now + 60
			data.closingTime = now + 120

			await generateContract(data, crowdsaleData.cap)
		})

		it('Should not accept payments before opening time', async function () {
			await expectRevert(
				crowdsale.buyTokens(signers[0].address, 1),
				'Crowdsale: not open',
			)
		})

		it('Should accept payments during the sale', async function () {
			await setTime(data.openingTime)

			const addr = signers[1]

			const buyAmount = crowdsaleData.minPurchaseAmount

			await pairToken.transfer(addr.address, buyAmount)

			await pairToken.connect(addr).approve(crowdsale.address, buyAmount)

			await crowdsale.connect(addr).buyTokens(addr.address, buyAmount)

			expect(await pairToken.balanceOf(addr.address)).to.equal(0)
			expect(await crowdsale.balanceOf(addr.address)).to.equal(buyAmount)
			expect(await crowdsale.contributors()).to.equal(1)
			expect(await crowdsale.tokensSold()).to.equal(buyAmount)
		})

		it('Should reject payments after closing time', async function () {
			await setTime(data.closingTime + 10)

			await expectRevert(
				crowdsale.buyTokens(signers[0].address, 1),
				'Crowdsale: not open',
			)
		})

		it('Should reject payments if beneficiary is the zero address or amount is 0', async function () {
			await generateContract(
				{ ...data, minPurchaseAmount: 0 },
				crowdsaleData.cap,
			)

			await setTime(data.openingTime)

			const addr = signers[1]

			const buyAmount = 50

			await pairToken.transfer(addr.address, buyAmount)

			await pairToken.connect(addr).approve(crowdsale.address, buyAmount)

			let buyTokens = crowdsale
				.connect(addr)
				.buyTokens(AddressZero, buyAmount)

			await expectRevert(
				buyTokens,
				'Crowdsale: beneficiary is the zero address',
			)

			buyTokens = crowdsale.connect(addr).buyTokens(addr.address, 0)

			await expectRevert(buyTokens, 'Crowdsale: amount is 0')
		})

		it('Should reject payments if cap is reached', async function () {
			await setTime(data.openingTime)

			const [owner, addr1] = signers

			const ownerBuyAmount = 60

			const addr1BuyAmount = 50

			await pairToken.approve(crowdsale.address, ownerBuyAmount)

			await crowdsale.buyTokens(owner.address, ownerBuyAmount)

			await pairToken.transfer(addr1.address, addr1BuyAmount)

			await pairToken
				.connect(addr1)
				.approve(crowdsale.address, addr1BuyAmount)

			const buyTokens = crowdsale
				.connect(addr1)
				.buyTokens(addr1.address, addr1BuyAmount)

			await expectRevert(buyTokens, 'Crowdsale: cap exceeded')
		})

		it('Should reject payments over individual cap', async function () {
			await setTime(data.openingTime)

			const addr = signers[1]

			const buyAmount = 50

			await pairToken.transfer(addr.address, buyAmount * 2)

			await pairToken
				.connect(addr)
				.approve(crowdsale.address, buyAmount * 2)

			await crowdsale.connect(addr).buyTokens(addr.address, buyAmount)

			const buyTokens = crowdsale
				.connect(addr)
				.buyTokens(addr.address, buyAmount)

			await expectRevert(
				buyTokens,
				"Crowdsale: beneficiary's cap exceeded",
			)
		})

		it('Should reject payments under minPurchaseAmount', async function () {
			await setTime(data.openingTime)

			const addr = signers[1]

			const buyAmount = 1

			await pairToken.transfer(addr.address, buyAmount)

			await pairToken.connect(addr).approve(crowdsale.address, buyAmount)

			const buyTokens = crowdsale
				.connect(addr)
				.buyTokens(addr.address, buyAmount)

			await expectRevert(
				buyTokens,
				'Crowdsale: amount is less than min purchase amount',
			)
		})

		it('Should reject payments if contract has not enough token balance', async function () {
			await generateContract(data, 49)

			await setTime(data.openingTime)

			const addr = signers[1]

			const buyAmount = 50

			await pairToken.transfer(addr.address, buyAmount)

			await pairToken.connect(addr).approve(crowdsale.address, buyAmount)

			const buyTokens = crowdsale
				.connect(addr)
				.buyTokens(addr.address, buyAmount)

			await expectRevert(buyTokens, 'Crowdsale: insufficient balance')
		})

		it('Should return correct crowdsale state', async function () {
			let { openingTime, closingTime } = await generateContract()

			expect(await crowdsale.isOpen()).to.equal(false)
			expect(await crowdsale.hasClosed()).to.equal(false)

			await setTime(openingTime)

			expect(await crowdsale.isOpen()).to.equal(true)
			expect(await crowdsale.hasClosed()).to.equal(false)

			await setTime(closingTime + 10)

			expect(await crowdsale.isOpen()).to.equal(false)
			expect(await crowdsale.hasClosed()).to.equal(true)

			const buyAmount = crowdsaleData.minPurchaseAmount

			const data = await generateContract(
				{ cap: buyAmount, goal: buyAmount },
				buyAmount,
			)

			openingTime = data.openingTime
			closingTime = data.closingTime

			await setTime(openingTime)

			const ownerAddr = signers[0].address

			await pairToken.transfer(ownerAddr, buyAmount)

			await pairToken.approve(crowdsale.address, buyAmount)

			await crowdsale.buyTokens(ownerAddr, buyAmount)

			expect(await crowdsale.isOpen()).to.equal(false)
			expect(await crowdsale.hasClosed()).to.equal(true)
		})

		it('Should not allow withdraw before closing time', async function () {
			await expectRevert(
				crowdsale.withdrawTokens(signers[0].address),
				'Crowdsale: not closed',
			)

			await setTime(data.openingTime)

			await expectRevert(
				crowdsale.withdrawTokens(signers[0].address),
				'Crowdsale: not closed',
			)
		})

		it('Should not allow withdraw without balance', async function () {
			await setTime(data.closingTime + 10)

			const addr = signers[1]

			await expectRevert(
				crowdsale.withdrawTokens(addr.address),
				'Crowdsale: beneficiary is not due any tokens',
			)
		})

		it('Should allow withdraw after closing time', async function () {
			await setTime(data.openingTime)

			const addr = signers[1]

			const buyAmount = 10

			await pairToken.transfer(addr.address, buyAmount)

			await pairToken.connect(addr).approve(crowdsale.address, buyAmount)

			await crowdsale.connect(addr).buyTokens(addr.address, buyAmount)

			await setTime(data.closingTime + 10)

			const crowdsaleBalance = await token.balanceOf(crowdsale.address)

			await crowdsale.withdrawTokens(addr.address)

			expect(await crowdsale.balanceOf(addr.address)).to.equal(0)
			expect(await token.balanceOf(addr.address)).to.equal(buyAmount)
			expect(await token.balanceOf(crowdsale.address)).to.equal(
				crowdsaleBalance.sub(buyAmount),
			)
			expect(await crowdsale.contributors()).to.equal(1)
		})

		it('Should allow withdraw after cap reached', async function () {
			const buyAmount = 20

			await generateContract({ ...data, cap: buyAmount }, buyAmount)

			await setTime(data.openingTime)

			const addr = signers[1]

			await pairToken.transfer(addr.address, buyAmount)

			await pairToken.connect(addr).approve(crowdsale.address, buyAmount)

			await crowdsale.connect(addr).buyTokens(addr.address, buyAmount)

			const crowdsaleBalance = await token.balanceOf(crowdsale.address)

			await crowdsale.withdrawTokens(addr.address)

			expect(await crowdsale.balanceOf(addr.address)).to.equal(0)
			expect(await token.balanceOf(addr.address)).to.equal(buyAmount)
			expect(await token.balanceOf(crowdsale.address)).to.equal(
				crowdsaleBalance.sub(buyAmount),
			)
			expect(await crowdsale.contributors()).to.equal(1)
		})

		it('Should not allow to finalize before closing time', async function () {
			await expectRevert(crowdsale.finalize(), 'Crowdsale: not closed')

			await setTime(data.openingTime)

			await expectRevert(crowdsale.finalize(), 'Crowdsale: not closed')
		})

		it('Should allow to finalize after closing time', async function () {
			await setTime(data.closingTime + 10)

			await crowdsale.connect(signers[1]).finalize()
		})

		it('Should allow to finalize if cap reached', async function () {
			const buyAmount = 20

			await generateContract({ ...data, cap: buyAmount }, buyAmount)

			await setTime(data.openingTime)

			const addr = signers[1]

			await pairToken.transfer(addr.address, buyAmount)

			await pairToken.connect(addr).approve(crowdsale.address, buyAmount)

			await crowdsale.connect(addr).buyTokens(addr.address, buyAmount)

			await crowdsale.finalize()
		})

		it('Should not allow to finalize if crowdsale already finalized before', async function () {
			await setTime(data.closingTime + 10)

			await crowdsale.finalize()

			await expectRevert(
				crowdsale.finalize(),
				'Crowdsale: already finalized',
			)
		})

		it('Should not allow to finalize if goal not reached', async function () {
			await generateContract({ ...data, goal: 10 })

			await setTime(data.closingTime + 10)

			await expectRevert(
				crowdsale.finalize(),
				'Crowdsale: goal not reached',
			)
		})

		it('Should not allow to refund before closing time', async function () {
			const address = signers[1].address

			await expectRevert(
				crowdsale.claimRefund(address),
				'Crowdsale: refunds not due',
			)

			await setTime(data.openingTime)

			await expectRevert(
				crowdsale.claimRefund(address),
				'Crowdsale: refunds not due',
			)
		})

		it('Should not allow to refund if goal reached', async function () {
			await setTime(data.closingTime + 10)

			await expectRevert(
				crowdsale.claimRefund(signers[1].address),
				'Crowdsale: refunds not due',
			)
		})

		it('Should not allow to refund if balance is 0', async function () {
			const { closingTime } = await generateContract({ goal: 10 })

			await setTime(closingTime + 10)

			await expectRevert(
				crowdsale.claimRefund(signers[1].address),
				'Crowdsale: beneficiary is not due any tokens',
			)
		})

		it('Should allow to refund after closing time, if goal not reached and if balance is greater than 0', async function () {
			const { openingTime, closingTime } = await generateContract(
				{ goal: 10 },
				crowdsaleData.cap,
			)

			await setTime(openingTime)

			const addr = signers[1]

			const buyAmount = 5

			await pairToken.transfer(addr.address, buyAmount)

			await pairToken.connect(addr).approve(crowdsale.address, buyAmount)

			await crowdsale.connect(addr).buyTokens(addr.address, buyAmount)

			await setTime(closingTime + 10)

			await crowdsale.claimRefund(addr.address)

			expect(await crowdsale.balanceOf(addr.address)).to.equal(0)
			expect(await pairToken.balanceOf(addr.address)).to.equal(5)
		})
	})
})
