// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IAstranoVestingWallet.sol";

/**
 * @title AstranoVestingWallet
 * @dev Handles the vesting of ERC20 token fees for Astrano
 * @custom:security-contact marcel.miro@astrano.io
 */
contract AstranoVestingWallet is IAstranoVestingWallet {
    address private _beneficiary;
    uint256 private immutable _startIn;
    uint256 private immutable _duration;
    mapping(address => Vest) private _vestings;

    struct Vest {
        uint256 start;
        uint256 released;
    }

    event Deposit(address indexed token, uint256 amount);
    event Released(address indexed token, uint256 amount);

    constructor(
        address beneficiary_,
        uint256 startIn_,
        uint256 duration_
    ) {
        require(beneficiary_ != address(0), "beneficiary is the zero address");
        require(duration_ > 0, "duration is 0");
        _beneficiary = beneficiary_;
        _startIn = startIn_;
        _duration = duration_;
    }

    /**
     * @return address to release tokens to
     */
    function beneficiary() external view returns (address) {
        return _beneficiary;
    }

    /**
     * @param beneficiary_ address to release tokens to
     */
    function setBeneficiary(address beneficiary_) external {
        require(_beneficiary == msg.sender, "caller not beneficiary");
        require(beneficiary_ != address(0), "beneficiary is the zero address");
        _beneficiary = beneficiary_;
    }

    /**
     * @return duration until vesting starts in unix seconds
     */
    function startIn() external view returns (uint256) {
        return _startIn;
    }

    /**
     * @return vesting duration in unix seconds
     */
    function duration() external view returns (uint256) {
        return _duration;
    }

    /**
     * @param token ERC20 address
     * @return vesting start timestamp for `token` in unix seconds
     */
    function start(address token) external view returns (uint256) {
        return _vestings[token].start;
    }

    /**
     * @param token ERC20 address
     * @return amount of released tokens for `token`
     */
    function released(address token) external view returns (uint256) {
        return _vestings[token].released;
    }

    /**
     * @param token ERC20 address
     * @return amount_ amount of releasable tokens for `token`
     * @return finished_ has vesting ended
     */
    function releasable(address token) public view returns (uint256 amount_, bool finished_) {
        // solhint-disable-next-line not-rely-on-time
        uint256 timestamp = block.timestamp;
        Vest memory vest = _vestings[token];
        if (vest.start == 0 || timestamp <= vest.start) {
            return (0, false);
        }
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (timestamp >= vest.start + _duration) {
            return (balance, true);
        }
        uint256 unreleased = (((balance + vest.released) * (timestamp - vest.start)) / _duration) - vest.released;
        return (unreleased, false);
    }

    /**
     * @dev Deposit tokens. Caller must have `amount` as the allowance of this contract (spender) for `token`
     * @param token ERC20 address
     * @param amount amount to deposit
     */
    function deposit(address token, uint256 amount) external {
        require(amount > 0, "amount is 0");
        SafeERC20.safeTransferFrom(IERC20(token), msg.sender, address(this), amount);
        Vest storage vest = _vestings[token];
        //solhint-disable-next-line not-rely-on-time
        if (vest.start == 0) vest.start = block.timestamp + _startIn;
        emit Deposit(token, amount);
    }

    /**
     * @dev Transfer releasable tokens for `token` to beneficiary
     * @param token ERC20 address
     */
    function release(address token) external {
        (uint256 unreleased, bool finished) = releasable(token);
        require(unreleased > 0, "no tokens due");
        _vestings[token].released += unreleased;
        SafeERC20.safeTransfer(IERC20(token), _beneficiary, unreleased);
        emit Released(token, unreleased);
        if (finished) {
            delete _vestings[token];
        }
    }
}
