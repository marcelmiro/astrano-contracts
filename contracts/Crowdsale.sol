// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Crowdsale
 * @dev Custom crowdsale contract for tokens launched by Astrano
 * @custom:security-contact marcel.miro@astrano.io
 */
contract Crowdsale is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Address balances
    mapping(address => uint256) private _balances;

    // Total number of contributors
    uint256 private _contributors;

    // Amount of token units sold
    uint256 private _tokensSold;

    // Has crowdsale ended
    bool private _finalized;

    // Token sold
    IERC20 private immutable _token;

    // Token used to fund crowdsale
    IERC20 private immutable _pairToken;

    // Number of token units a buyer gets per pair token units
    // For example, a rate of 10 ** decimals will give 1 TKN per wei sent
    // 1 TKN unit = 1 / (10 ** decimals) TKN
    uint256 private immutable _rate;

    // Max amount of token units that the crowdsale is allowed to sell
    uint256 private immutable _cap;

    // Max amount of token units that a wallet can purchase
    uint256 private immutable _individualCap;

    // Min amount of token units that an address can buy per transaction
    uint256 private immutable _minPurchaseAmount;

    // Minimum amount of sold token units required for the crowdsale to be successful
    // If goal is not reached, all contributions will be refunded to its buyers
    uint256 private immutable _goal;

    // Time crowdsale starts in unix epoch seconds
    uint256 private immutable _openingTime;

    // Time crowdsale ends in unix epoch seconds
    uint256 private immutable _closingTime;

    /**
     * Event for token purchase logging
     * @param beneficiary address to receive token
     * @param value amount of pair tokens sent
     * @param amount amount of tokens purchased
     */
    event TokensPurchased(address indexed beneficiary, uint256 value, uint256 amount);

    // Event for crowdsale finalize logging
    event Finalized();

    /**
     * @param tokenAddress_ address of token sold
     * @param pairTokenAddress_ address of token used to fund crowdsale
     * @param rate_ number of token units a buyer gets per pair token units
     * @param cap_ max amount of token units that the crowdsale is allowed to sell
     * @param individualCap_ max amount of token units that a wallet can purchase
     * @param minPurchaseAmount_ min amount of token units that an address can buy per transaction
     * @param goal_ minimum amount of sold token units required for the crowdsale to be successful
     * @param openingTime_ time crowdsale starts in unix epoch seconds
     * @param closingTime_ time crowdsale ends in unix epoch seconds
     */
    constructor(
        address tokenAddress_,
        address pairTokenAddress_,
        uint256 rate_,
        uint256 cap_,
        uint256 individualCap_,
        uint256 minPurchaseAmount_,
        uint256 goal_,
        uint256 openingTime_,
        uint256 closingTime_
    ) {
        require(tokenAddress_ != address(0), "Crowdsale: token address is the zero address");
        require(pairTokenAddress_ != address(0), "Crowdsale: pair token address is the zero address");

        require(rate_ > 0, "Crowdsale: rate is 0");
        require(cap_ > 0, "Crowdsale: cap is 0");
        require(goal_ <= cap_, "Crowdsale: goal is greater than cap");

        // solhint-disable-next-line not-rely-on-time
        require(openingTime_ >= block.timestamp, "Crowdsale: opening time is before current time");
        require(closingTime_ > openingTime_, "Crowdsale: opening time is not before closing time");

        _token = IERC20(tokenAddress_);
        _pairToken = IERC20(pairTokenAddress_);
        _rate = rate_;
        _cap = cap_;
        _individualCap = individualCap_;
        _minPurchaseAmount = minPurchaseAmount_;
        _goal = goal_;
        _openingTime = openingTime_;
        _closingTime = closingTime_;
    }

    /**
     * @return token sold
     */
    function token() external view returns (address) {
        return address(_token);
    }

    /**
     * @return token used to fund crowdsale
     */
    function pairToken() external view returns (address) {
        return address(_pairToken);
    }

    /**
     * @return number of token units a buyer gets per pair token units
     * @dev for example, a rate of 10 ** decimals will give 1 TKN per wei sent
     * @dev 1 TKN unit = 1 / (10 ** decimals) TKN
     */
    function rate() external view returns (uint256) {
        return _rate;
    }

    /**
     * @return max amount of token units that the crowdsale is allowed to sell
     */
    function cap() external view returns (uint256) {
        return _cap;
    }

    /**
     * @return max amount of token units that a wallet can purchase
     */
    function individualCap() external view returns (uint256) {
        return _individualCap;
    }

    /**
     * @return min amount of token units that an address can buy per transaction
     */
    function minPurchaseAmount() external view returns (uint256) {
        return _minPurchaseAmount;
    }

    /**
     * @return min amount of sold token units required for the crowdsale to be successful
     * @dev if goal is not reached, all contributions will be refunded to its buyers
     */
    function goal() external view returns (uint256) {
        return _goal;
    }

    /**
     * @return time crowdsale starts in unix epoch seconds
     */
    function openingTime() external view returns (uint256) {
        return _openingTime;
    }

    /**
     * @return time crowdsale ends in unix epoch seconds
     */
    function closingTime() external view returns (uint256) {
        return _closingTime;
    }

    /**
     * @return amount of token units sold
     */
    function tokensSold() external view returns (uint256) {
        return _tokensSold;
    }

    /**
     * @return amount of tokens owned by `account`
     */
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    /**
     * @return total amount of contributors
     */
    function contributors() external view returns (uint256) {
        return _contributors;
    }

    /**
     * @return boolean where true means that the crowdsale has finished
     */
    function hasClosed() public view returns (bool) {
        // solhint-disable-next-line not-rely-on-time
        return block.timestamp > _closingTime || _tokensSold >= _cap;
    }

    /**
     * @return boolean where true means that the crowdsale is still running
     */
    function isOpen() public view returns (bool) {
        // solhint-disable-next-line not-rely-on-time
        return block.timestamp >= _openingTime && !hasClosed();
    }

    /**
     * @param beneficiary_ address to send the sold tokens to
     * @param amount_ amount of pair token units used to purchase tokens
     */
    function buyTokens(address beneficiary_, uint256 amount_) external nonReentrant {
        require(isOpen(), "Crowdsale: not open");

        require(beneficiary_ != address(0), "Crowdsale: beneficiary is the zero address");
        require(amount_ > 0, "Crowdsale: amount is 0");
        require(amount_ >= _minPurchaseAmount, "Crowdsale: amount is less than min purchase amount");

        // Calculate token amount to be sold
        uint256 tokenAmount = amount_ * _rate;

        uint256 futureBalance = _balances[beneficiary_] + tokenAmount;
        require(futureBalance <= _individualCap, "Crowdsale: beneficiary's cap exceeded");

        uint256 futureTokensSold = _tokensSold + tokenAmount;
        require(futureTokensSold <= _cap, "Crowdsale: cap exceeded");

        _pairToken.safeTransferFrom(msg.sender, address(this), amount_);

        // Validate after transferFrom as transferFrom is more likely to fail thus function is more gas efficient
        require(_token.balanceOf(address(this)) >= futureTokensSold, "Crowdsale: insufficient balance");

        emit TokensPurchased(beneficiary_, amount_, tokenAmount);

        _tokensSold = futureTokensSold;
        _balances[beneficiary_] = futureBalance;
        _contributors++;
    }

    /**
     * @param beneficiary_ Address whose tokens will be withdrawn
     */
    function withdrawTokens(address beneficiary_) external {
        require(hasClosed(), "Crowdsale: not closed");

        uint256 tokenAmount = _balances[beneficiary_];
        require(tokenAmount > 0, "Crowdsale: beneficiary is not due any tokens");

        _balances[beneficiary_] = 0;
        _token.safeTransfer(beneficiary_, tokenAmount);
    }

    /**
     * @dev Process the end of the crowdsale
     */
    function finalize() external {
        require(hasClosed(), "Crowdsale: not closed");
        require(_tokensSold >= _goal, "Crowdsale: goal not reached");
        require(!_finalized, "Crowdsale: already finalized");

        _finalized = true;

        // TODO: Generate LP and transfer left over tokens

        emit Finalized();
    }

    /**
     * @dev Refund tokens bought by `beneficiary_`
     */
    function claimRefund(address beneficiary_) external {
        require(hasClosed() && _tokensSold < _goal, "Crowdsale: refunds not due");

        uint256 amount = _balances[beneficiary_] / _rate;

        require(amount > 0, "Crowdsale: beneficiary is not due any tokens");

        _balances[beneficiary_] = 0;

        _pairToken.safeTransfer(beneficiary_, amount);

        // emit Refund(beneficiary_, amount);
    }
}
