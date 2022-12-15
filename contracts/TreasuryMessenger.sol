//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Wormhole/IWormhole.sol";
import "./Wormhole/ITokenBridge.sol";
import "./Wormhole/BridgeStructs.sol";
import "./Wormhole/PortalWrappedToken.sol";
import "./solidity-bytes-utils/BytesLib.sol";

contract TreasuryMessenger {
    using BytesLib for bytes;

    address private token_bridge_address = address(0xF890982f9310df57d00f659cf4fd87e65adEd8d7);
    ITokenBridge token_bridge = ITokenBridge(token_bridge_address);
    address private TKN_address = address(0x94CB6E2F783b9F5274ccd19c7e316bd5badADa98); 
    ERC20 TKN = ERC20(TKN_address);

    address private token_bridge_polygon_address = address(0x377D55a7928c046E18eEbb61977e714d2a76472a);
    ITokenBridge token_bridge_polygon = ITokenBridge(token_bridge_polygon_address);
    address private TKN_address_wrapped = address(0xb541C0f67476087323B226C8dF94f03CeA4D4a6c); 
    PortalWrappedToken WTKN = PortalWrappedToken(TKN_address_wrapped);

    address private wormhole_core_bridge_address = address(0x706abc4E45D419950511e474C7B9Ed348A4a716c);
    IWormhole core_bridge = IWormhole(wormhole_core_bridge_address);
    address private wormhole_core_bridge_polygon_address = address(0x0CBE91CF822c73C2315FB05100C2F714765d5c20);
    IWormhole core_bridge_polygon = IWormhole(wormhole_core_bridge_polygon_address);

    uint32 nonce = 0;

    string private current_msg;
    address owner;

    constructor(){
        owner = msg.sender;
    }

    //Returns the Balance of this Contract
    function getTKNCount() public view returns (uint256) {
        return TKN.balanceOf(address(this));
    }

    //Returns the Balance of Wrapped Count
    function getWrappedCount() public view returns (uint256) {
        return WTKN.balanceOf(address(this));
    }

    function approveTokenBridge(uint256 amt) public returns (bool) {
        return TKN.approve(token_bridge_address, amt);
    }

    function bridgeToken(uint256 amt, uint16 receipientChainId, bytes32 recipient) public returns (uint64 sequence) {
        nonce += 1;
        return token_bridge.transferTokens(TKN_address, amt, receipientChainId, recipient, 0, nonce);
    }

    function approveWrappedTokenBridge(uint256 amt) public returns (bool) {
        return WTKN.approve(token_bridge_polygon_address, amt);
    }

    function bridgeWrappedToken(uint256 amt, uint16 receipientChainId, bytes32 recipient) public returns (uint64 sequence) {
        nonce += 1;
        return token_bridge_polygon.transferTokens(TKN_address_wrapped, amt, receipientChainId, recipient, 0, nonce);
    }

    function bridgeTokenMsg(uint256 amt, uint16 receipientChainId, bytes32 recipient, string memory payload) public returns (uint64 sequence) {
        nonce += 1;
        return token_bridge.transferTokensWithPayload(TKN_address, amt, receipientChainId, recipient, nonce, bytes(payload));
    }

    function bridgeTokenMsgPolygon(uint256 amt, uint16 receipientChainId, bytes32 recipient, string memory payload) public returns (uint64 sequence) {
        nonce += 1;
        return token_bridge_polygon.transferTokensWithPayload(TKN_address_wrapped, amt, receipientChainId, recipient, nonce, bytes(payload));
    }

    function completeTransfer(bytes memory encodedMsg) public {
        BridgeStructs.TransferWithPayload memory vaa = _decodePayload(token_bridge.completeTransferWithPayload(encodedMsg));
        //Do the thing
        current_msg = string(vaa.payload);
    }

    function completeTransferPolygon(bytes memory encodedMsg) public {
        BridgeStructs.TransferWithPayload memory vaa = _decodePayload(token_bridge_polygon.completeTransferWithPayload(encodedMsg));
        //Do the thing
        current_msg = string(vaa.payload);
    }

    function getCurrentMsg() public view returns (string memory){
        return current_msg;
    }

    function _decodePayload(bytes memory payload) internal pure returns (BridgeStructs.TransferWithPayload memory) {
        BridgeStructs.TransferWithPayload memory decoded = BridgeStructs.TransferWithPayload({
            payloadID: payload.slice(0,1).toUint8(0),
            amount: payload.slice(1,32).toUint256(0),
            tokenAddress: payload.slice(33,32).toBytes32(0),
            tokenChain: payload.slice(65,2).toUint16(0),
            to: payload.slice(67,32).toBytes32(0), 
            toChain: payload.slice(99,2).toUint16(0),
            fromAddress: payload.slice(101,32).toBytes32(0),
            payload: payload.slice(133, payload.length-133)
        });

        return decoded;
    }
}