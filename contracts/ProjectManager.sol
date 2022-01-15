// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./Token.sol";
import "./Crowdsale.sol";

/**
 * @title ProjectManager
 * @dev Manager to create Astrano projects
 * @custom:security-contact marcel.miro@astrano.io
 */
contract ProjectManager is Ownable, ReentrancyGuard {
    struct Project {
        address token;
        address crowdsale;
    }

    // Address to send fees to
    address payable private _wallet;

    // Fee to create project in wei
    uint256 private _creationFee;

    // Percentage fee to subtract from token supply (0 - 10000)
    uint256 private _tokenFee;

    // Crowdsale pair token address
    address private _crowdsalePairTokenAddress;

    // LP pair token address
    address private _lpPairTokenAddress;

    Project[] private _projects;

    constructor(
        address payable wallet_,
        uint256 creationFee_,
        uint256 tokenFee_,
        address crowdsalePairTokenAddress_,
        address lpPairTokenAddress_
    ) {
        require(tokenFee_ <= 10000, "ProjectManager: token fee greater than 10000");

        require(wallet_ != address(0), "ProjectManager: wallet address is the zero address");
        require(
            crowdsalePairTokenAddress_ != address(0),
            "ProjectManager: crowdsale pair token address is the zero address"
        );
        require(lpPairTokenAddress_ != address(0), "ProjectManager: LP pair token address is the zero address");

        _wallet = wallet_;
        _creationFee = creationFee_;
        _tokenFee = tokenFee_;
        _crowdsalePairTokenAddress = crowdsalePairTokenAddress_;
        _lpPairTokenAddress = lpPairTokenAddress_;
    }

    /**
     * @return address to send fees to
     */
    function wallet() external view returns (address) {
        return _wallet;
    }

    /**
     * @param wallet_ address to send fees to
     */
    function setWallet(address payable wallet_) external onlyOwner {
        _wallet = wallet_;
    }

    /**
     * @return fee to create projects
     */
    function creationFee() external view returns (uint256) {
        return _creationFee;
    }

    /**
     * @param creationFee_ fee to create projects
     */
    function setCreationFee(uint256 creationFee_) external onlyOwner {
        _creationFee = creationFee_;
    }

    /**
     * @return percentage fee to subtract from token supply (0 - 10000)
     */
    function tokenFee() external view returns (uint256) {
        return _tokenFee;
    }

    /**
     * @param tokenFee_ percentage fee to subtract from token supply (0 - 10000)
     */
    function setTokenFee(uint256 tokenFee_) external onlyOwner {
        require(tokenFee_ <= 10000, "ProjectManager: token fee greater than 10000");
        _tokenFee = tokenFee_;
    }

    /**
     * @return crowdsale pair token address
     */
    function crowdsalePairTokenAddress() external view returns (address) {
        return _crowdsalePairTokenAddress;
    }

    /**
     * @param crowdsalePairTokenAddress_ crowdsale pair token address
     */
    function setCrowdsalePairTokenAddress(address crowdsalePairTokenAddress_) external onlyOwner {
        _crowdsalePairTokenAddress = crowdsalePairTokenAddress_;
    }

    /**
     * @return lp pair token address
     */
    function lpPairTokenAddress() external view returns (address) {
        return _lpPairTokenAddress;
    }

    /**
     * @param lpPairTokenAddress_ lp pair token address
     */
    function setLpPairTokenAddress(address lpPairTokenAddress_) external onlyOwner {
        _lpPairTokenAddress = lpPairTokenAddress_;
    }

    function createProject(
        string memory tokenName_,
        string memory tokenSymbol_,
        uint256 tokenTotalSupply_,
        uint256 crowdsaleRate_,
        uint256 crowdsaleCap_,
        uint256 crowdsaleIndividualCap_,
        uint256 crowdsaleMinPurchaseAmount_,
        uint256 crowdsaleGoal_,
        uint256 crowdsaleOpeningTime_,
        uint256 crowdsaleClosingTime_
    ) external payable nonReentrant returns (uint256, Project memory) {
        require(msg.value >= _creationFee, "ProjectManager: insufficient funds sent");

        uint256 tokenFeeAmount = (tokenTotalSupply_ * _tokenFee) / 10000;

        uint256 leftTokenAmount = tokenTotalSupply_ - tokenFeeAmount;

        require(leftTokenAmount >= crowdsaleCap_, "ProjectManager: insuffienct token supply created");

        IERC20 token = new Token(tokenName_, tokenSymbol_, tokenTotalSupply_);

        Crowdsale crowdsale = new Crowdsale(
            address(token),
            _crowdsalePairTokenAddress,
            crowdsaleRate_,
            crowdsaleCap_,
            crowdsaleIndividualCap_,
            crowdsaleMinPurchaseAmount_,
            crowdsaleGoal_,
            crowdsaleOpeningTime_,
            crowdsaleClosingTime_
        );

        token.transfer(_wallet, tokenFeeAmount);

        token.transfer(address(crowdsale), crowdsaleCap_);

        Project memory project = Project(address(token), address(crowdsale));

        _projects.push(project);

        _wallet.transfer(msg.value);

        uint256 id;

        unchecked {
            id = _projects.length - 1;
        }

        return (id, project);
    }

    function getProject(uint256 id) external view returns (Project memory) {
        return _projects[id];
    }
}

/**
 * @title Vault
 * @dev Deposit and withdraw ETH
 */
contract Vault {
    address private immutable _owner;

    constructor() {
        _owner = msg.sender;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev allow contract to receive wei
     */
    receive() external payable {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @param recipient_ address to send wei to
     * @param amount_ amount of wei to withdraw
     */
    function withdraw(address payable recipient_, uint256 amount_) external onlyOwner {
        recipient_.transfer(amount_);
    }

    /**
     * @param recipient_ address to send wei to
     */
    function withdrawAll(address payable recipient_) external onlyOwner {
        recipient_.transfer(address(this).balance);
    }
}
