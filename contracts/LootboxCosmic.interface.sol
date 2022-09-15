// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface Lootbox {
    struct Deposit {
        address depositer;
        uint256 depositId;
        uint256 blockNumber;
        uint256 nativeTokenAmount;
        address erc20Token;
        uint256 erc20TokenAmount;
        uint256 timestamp;
    }

    struct DepositMetadata {
        address depositer;
        uint256 ticketId;
        uint256 depositId;
        bool redeemed;
        uint256 nativeTokenAmount;
        address erc20Token;
        uint256 erc20TokenAmount;
        uint256 timestamp;
    }

    event DepositEarnings(
        address indexed depositor,
        address lootbox,
        uint256 depositId,
        uint256 nativeTokenAmount,
        address erc20Token,
        uint256 erc20Amount
    );

    event MintTicket(
        address indexed redeemer,
        address lootbox,
        uint256 ticketId
    );
    event WithdrawEarnings(
        address indexed withdrawer,
        address lootbox,
        uint256 ticketId,
        uint256 depositId,
        uint256 nativeTokenAmount,
        address erc20Token,
        uint256 erc20Amount
    );

    function mint(bytes calldata signature, uint256 nonce)
        external
        returns (uint256 _ticketId);

    function withdrawEarnings(uint256 ticketId) external;

    function viewTotalDepositOfErc20Token(address erc20Token)
        external
        view
        returns (uint256 _totalDeposit);

    function viewTotalDepositOfNativeToken()
        external
        view
        returns (uint256 _totalDeposit);

    function viewAllDeposits()
        external
        view
        returns (Deposit[] memory _deposits);

    function viewAllTicketsOfHolder(address holder)
        external
        view
        returns (uint256[] memory _tickets);

    function viewProratedDepositsForTicket(uint256 ticketId)
        external
        view
        returns (DepositMetadata[] memory _depositsMetadatas);

    function viewDeposit(uint256 depositId)
        external
        view
        returns (Deposit memory _deposit);

    function depositEarningsErc20(address erc20Token, uint256 erc20Amount)
        external
        payable;

    function depositEarningsNative() external payable;

    function flushTokens(address _flushTarget) external;

    function changeMaxTickets(uint256 _maxTickets) external;
}
