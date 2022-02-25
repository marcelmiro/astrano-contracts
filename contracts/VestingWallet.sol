// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IVestingWallet.sol";

/**
 * @title VestingWallet
 * @dev Handles the vesting of ERC20 tokens for a given beneficiary
 * @custom:security-contact marcel.miro@astrano.io
 */
contract VestingWallet is IVestingWallet {
    address private immutable _beneficiary;
    mapping(address => Vest) private _vestings;

    struct Vest {
        uint64 start;
        uint64 duration;
        uint256 released;
    }

    event Deposit(address indexed token, uint256 amount);
    event Released(address indexed token, uint256 amount);

    constructor(address beneficiary_) {
        require(beneficiary_ != address(0), "beneficiary is the zero address");
        _beneficiary = beneficiary_;
    }

    /**
     * @return address to release tokens to
     */
    function beneficiary() external view returns (address) {
        return _beneficiary;
    }

    /**
     * @param token ERC20 address
     * @return time to start vesting for `token`
     */
    function start(address token) external view returns (uint256) {
        return _vestings[token].start;
    }

    /**
     * @param token ERC20 address
     * @return vesting duration for `token`
     */
    function duration(address token) external view returns (uint256) {
        return _vestings[token].duration;
    }

    /**
     * @param token ERC20 address
     * @return amount of tokens released for `token`
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
        if (timestamp >= vest.start + vest.duration) {
            return (balance, true);
        }
        uint256 unreleased = (((balance + vest.released) * (timestamp - vest.start)) / vest.duration) - vest.released;
        return (unreleased, false);
    }

    /**
     * @dev Deposit tokens. Caller must have `amount` as the allowance of this contract (spender) for `token`
     * @param token ERC20 address
     * @param amount amount of tokens deposited
     * @param startIn_ duration until vesting starts in unix seconds
     * @param duration_ vesting duration in unix seconds
     */
    function deposit(
        address token,
        uint256 amount,
        uint256 startIn_,
        uint256 duration_
    ) external {
        require(amount > 0, "amount is 0");
        SafeERC20.safeTransferFrom(IERC20(token), msg.sender, address(this), amount);
        Vest storage vest = _vestings[token];
        if (vest.start == 0) {
            require(duration_ > 0, "duration is 0");
            // solhint-disable-next-line not-rely-on-time
            vest.start = uint64(block.timestamp + startIn_);
            vest.duration = uint64(duration_);
        }
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
        if (finished) delete _vestings[token];
    }
}
