# Guild Onboarding

## Chronological Order

1. [On Chain - Smart Contract](#1-on-chain---smart-contract)
2. [Off Chain - Firebase](#2-off-chain---firebase)


### 1. On Chain - Smart Contract

1. Use FX_DAO wallet to create a new Guild smart contract
	a. This is just temporary until we have a frontend to let Founders create their Guild using their own wallet
	b. We must manually copy & paste the smart contract addresses to Retool to be entered into Firebase off-chain. In the future this will be an automated script.

### 2. Off Chain - Firebase

1. Use Retool to create a new Guild, which gets saved to Firestore (copy over the smart contract addresses)
2. Use Retool to create a new User
3. Use Retool to create a new Guild Member, by connecting User to Guild
4. Use Retool to create a new Fundraiser, via a Guild 
5. Copy the Crowdsale URL on frontend, and view it in the browser


