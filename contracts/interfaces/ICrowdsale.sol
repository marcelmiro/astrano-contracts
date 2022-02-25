// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICrowdsale {
    function token() external view returns (IERC20);

    function pairToken() external view returns (IERC20);

    function rate() external view returns (uint256);

    function cap() external view returns (uint256);

    function individualCap() external view returns (uint256);

    function minPurchaseAmount() external view returns (uint256);

    function goal() external view returns (uint256);

    function openingTime() external view returns (uint256);

    function closingTime() external view returns (uint256);

    function tokensSold() external view returns (uint256);

    function finalized() external view returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function contributors() external view returns (uint256);

    function goalReached() external view returns (bool);

    function hasClosed() external view returns (bool);

    function isOpen() external view returns (bool);

    function finalizeExpired() external view returns (bool);

    function refundsActive() external view returns (bool);

    function buy(address beneficiary_, uint256 amount_) external;

    function finalize() external returns (uint256);

    function withdraw(address account) external;

    function refund(address account) external;

    function withdrawExpiredTokens() external;
}
