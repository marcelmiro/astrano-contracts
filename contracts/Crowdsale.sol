// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/ICrowdsale.sol";

/**
 * @title Crowdsale
 * @dev Perform a crowdsale for an ERC20 token launched by Astrano
 * @custom:security-contact marcel.miro@astrano.io
 */
contract Crowdsale is ReentrancyGuard, ICrowdsale {
    IERC20 private immutable _token;
    IERC20 private immutable _pairToken;
    address private immutable _owner;
    address private immutable _finalizer;
    uint256 private immutable _rate;
    uint256 private immutable _cap;
    uint256 private immutable _individualCap;
    uint256 private immutable _minPurchaseAmount;
    uint256 private immutable _goal;
    uint256 private immutable _openingTime;
    uint256 private immutable _closingTime;

    mapping(address => uint256) private _balances;
    uint256 private _contributors;
    uint256 private _tokensSold;
    bool private _finalized;

    event TokensPurchased(address indexed beneficiary, uint256 tokenAmount, uint256 pairTokenAmount);
    event Finalized();
    event Withdraw(address indexed account, uint256 amount);
    event Refund(address indexed account, uint256 amount);
    event WithdrawExpiredTokens(uint256 amount);

    /**
     * @param tokenAddress_ address of token sold
     * @param pairTokenAddress_ address of token used to fund crowdsale
     * @param owner_ owner address
     * @param finalizer_ address that can finalize crowdsale
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
        address owner_,
        address finalizer_,
        uint256 rate_,
        uint256 cap_,
        uint256 individualCap_,
        uint256 minPurchaseAmount_,
        uint256 goal_,
        uint256 openingTime_,
        uint256 closingTime_
    ) {
        require(tokenAddress_ != address(0), "token is the zero address");
        require(pairTokenAddress_ != address(0), "pair token is the zero address");
        require(owner_ != address(0), "owner is the zero address");
        require(finalizer_ != address(0), "finalizer is the zero address");

        require(rate_ > 0, "rate is 0");
        require(cap_ > 0, "cap is 0");
        require(goal_ <= cap_, "goal is greater than cap");

        /* solhint-disable-next-line not-rely-on-time */
        require(openingTime_ >= block.timestamp, "opening before current time");
        require(closingTime_ > openingTime_, "closing not after opening time");

        _token = IERC20(tokenAddress_);
        _pairToken = IERC20(pairTokenAddress_);
        _owner = owner_;
        _finalizer = finalizer_;
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
    function token() external view returns (IERC20) {
        return _token;
    }

    /**
     * @return token used to fund crowdsale
     */
    function pairToken() external view returns (IERC20) {
        return _pairToken;
    }

    /**
     * @return number of token units a buyer gets per pair token units
     * @dev For example, a rate of 10 ** 18 will give 1 TKN per wei sent
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
     * @return has goal been reached
     */
    function goalReached() public view returns (bool) {
        return _tokensSold >= _goal;
    }

    /**
     * @return has crowdsale ended
     */
    function hasClosed() public view returns (bool) {
        /* solhint-disable-next-line not-rely-on-time */
        return block.timestamp > _closingTime || _tokensSold >= _cap;
    }

    /**
     * @return is crowdsale open
     */
    function isOpen() public view returns (bool) {
        /* solhint-disable-next-line not-rely-on-time */
        return block.timestamp >= _openingTime && !hasClosed();
    }

    /**
     * @return has time to finalize expired
     */
    function finalizeExpired() public view returns (bool) {
        /* solhint-disable-next-line not-rely-on-time */
        return block.timestamp > _closingTime + 30 * 1 days;
    }

    /**
     * @return are refunds active
     */
    function refundsActive() public view returns (bool) {
        return hasClosed() && (!goalReached() || (!_finalized && finalizeExpired()));
    }

    /**
     * @dev Purchase tokens. Caller must have `amount_` as the allowance of this contract (spender) for the pair token
     * @param beneficiary_ address to send the sold tokens to
     * @param amount_ amount of pair token units used to purchase tokens
     */
    function buy(address beneficiary_, uint256 amount_) external nonReentrant {
        require(isOpen(), "crowdsale not open");

        require(beneficiary_ != address(0), "beneficiary is the zero address");
        require(amount_ > 0, "amount is 0");
        require(amount_ >= _minPurchaseAmount, "amount less than minimum amount");

        uint256 tokenAmount = amount_ * _rate;
        uint256 futureBalance = _balances[beneficiary_] + tokenAmount;
        require(futureBalance <= _individualCap, "beneficiary's cap exceeded");
        uint256 futureTokensSold = _tokensSold + tokenAmount;
        require(futureTokensSold <= _cap, "cap exceeded");

        // Revert ordering efficiency
        SafeERC20.safeTransferFrom(_pairToken, msg.sender, address(this), amount_);
        require(_token.balanceOf(address(this)) >= futureTokensSold, "insufficient balance");

        emit TokensPurchased(beneficiary_, tokenAmount, amount_);

        _tokensSold = futureTokensSold;
        _balances[beneficiary_] = futureBalance;
        _contributors++;
    }

    /**
     * @dev Process the end of the crowdsale
     */
    function finalize() external returns (uint256) {
        require(_finalizer == msg.sender, "caller not authorized");
        require(hasClosed(), "crowdsale not closed");
        require(goalReached(), "goal not reached");
        require(!_finalized, "already finalized");
        require(!finalizeExpired(), "time to finalize has expired");
        _finalized = true;

        uint256 pairTokenBalance = _pairToken.balanceOf(address(this));
        _pairToken.approve(_finalizer, pairTokenBalance);
        SafeERC20.safeTransfer(_pairToken, _finalizer, pairTokenBalance);
        uint256 tokenBalance = _token.balanceOf(address(this));
        uint256 remainingTokenAmount;
        unchecked {
            remainingTokenAmount = tokenBalance - _tokensSold;
        }
        if (remainingTokenAmount > 0) {
            _token.transfer(_finalizer, remainingTokenAmount);
        }

        emit Finalized();
        // TODO: Delete variables not used anymore to save gas? (e.g. finalizer)
        return pairTokenBalance;
    }

    /**
     * @dev Withdraw tokens purchased
     * @param account address that withdraws the purchased tokens
     */
    function withdraw(address account) external {
        require(_finalized, "crowdsale not finalized");
        uint256 tokenAmount = _balances[account];
        require(tokenAmount > 0, "beneficiary not due any tokens");
        _balances[account] = 0;
        SafeERC20.safeTransfer(_token, account, tokenAmount);
        emit Withdraw(account, tokenAmount);
    }

    /**
     * @dev Refund tokens purchased
     * @param account address that refunds its purchased tokens
     */
    function refund(address account) external {
        require(refundsActive(), "refunds not due");
        uint256 amount = _balances[account] / _rate;
        require(amount > 0, "beneficiary not due any tokens");
        _balances[account] = 0;
        SafeERC20.safeTransfer(_pairToken, account, amount);
        emit Refund(account, amount);
    }

    /**
     * @dev Withdraw `token` balance when crowdsale has expired
     */
    function withdrawExpiredTokens() external {
        require(refundsActive(), "crowdsale not expired");
        uint256 tokenBalance = _token.balanceOf(address(this));
        SafeERC20.safeTransfer(_token, _owner, tokenBalance);
        emit WithdrawExpiredTokens(tokenBalance);
    }
}
