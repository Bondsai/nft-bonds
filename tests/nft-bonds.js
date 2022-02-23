const anchor = require('@project-serum/anchor');
const { SystemProgram, PublicKey, TOKEN_PROGRAM_ID } = anchor.web3;


const main = async() => {
  console.log("🚀 Starting test...");

  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NftBonds;
  const baseAccount = anchor.web3.Keypair.generate();

  console.log("Base pub:", baseAccount.publicKey)
  console.log("My pub:", provider.wallet.publicKey)

  const tx = await program.rpc.initialize({
    accounts: {
      baseAccount: baseAccount.publicKey,
      user: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    },
    signers: [baseAccount],
  });

  console.log("📝 Your transaction signature", tx);

  // const txTransfer = await program.rpc.tryTransferNft(
  //     {
  //   accounts: {
  //     baseAccount: baseAccount.publicKey,
  //     signer: provider.wallet.publicKey,
  //     tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  //     from: new PublicKey("6JLQCmQXnMuGd7hwxuHjMGpDL2kLLe8WY89ZV9Xo33mV"),
  //     to: new PublicKey("967TCyYJQqRjKHdmActdKMiX3LUoXcvDiaJAXtaLvSfB")
  //   }
  // });
  //
  // console.log("📝 Your transaction TRANSFER", txTransfer);

  const txTransferToVault = await program.rpc.initialize({
    accounts: {
      baseAccount: baseAccount.publicKey,
      user: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    },
    signers: [baseAccount],
  });



  // Fetch data from the account.


};

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

runMain();