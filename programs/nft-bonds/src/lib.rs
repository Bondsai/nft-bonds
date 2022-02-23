mod utils;

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use anchor_lang::accounts::program::Program;
use anchor_lang::context::CpiContext;
use anchor_lang::accounts::program_account::ProgramAccount;

declare_id!("8LxVy5z37GBWNHwF45XBe3DT82qdbd9Zez2BCe3BrPw1");

#[program]
pub mod nft_bonds {
    use super::*;
    use spl_token::instruction::AuthorityType;
    use anchor_spl::token::SetAuthority;

    const ESCROW_PDA_SEED: &[u8] = b"escrow";


    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn try_transfer_nft(ctx: Context<TransferNFT>) -> Result<()> {
        let owner_user = &mut ctx.accounts.signer;
        let from = ctx.accounts.from.to_account_info();
        let to = ctx.accounts.to.to_account_info();

        let cpi_accounts: Transfer = Transfer {
            from: from.clone(),
            to: to.clone(),
            authority: owner_user.to_account_info().clone()
        };

        let token_program: AccountInfo = ctx.accounts.token_program.to_account_info().clone();

        let cpi_ctx: CpiContext<Transfer> = CpiContext::new(token_program, cpi_accounts);
        token::transfer(cpi_ctx, 1)?;



        Ok(())
    }

    pub fn create_event(ctx: Context<CreateEvent>,
                        _vault_account_bump: u8,
                        initializer_amount: u64,
                        taker_amount: u64) -> Result<()> {
        ctx.accounts.escrow_account.initializer_key = *ctx.accounts.initializer.key;
        ctx.accounts
            .escrow_account
            .initializer_deposit_token_account = *ctx
            .accounts
            .initializer_deposit_token_account
            .to_account_info()
            .key;
        ctx.accounts
            .escrow_account
            .initializer_receive_token_account = *ctx
            .accounts
            .initializer_receive_token_account
            .to_account_info()
            .key;
        ctx.accounts.escrow_account.initializer_amount = initializer_amount;
        ctx.accounts.escrow_account.taker_amount = taker_amount;

        let (vault_authority, _vault_authority_bump) =
            Pubkey::find_program_address(&[ESCROW_PDA_SEED], ctx.program_id);

        token::set_authority(
            ctx.accounts.into_set_authority_context(),
            AuthorityType::AccountOwner,
            Some(vault_authority),
        )?;

        token::transfer(
            ctx.accounts.into_transfer_to_pda_context(),
            ctx.accounts.escrow_account.initializer_amount,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program <'info, System>,
}

#[derive(Accounts)]
pub struct TransferNFT<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>
}

#[account]
pub struct EventAccount {
    pub initializer_key: Pubkey,
    pub initializer_deposit_token_account: Pubkey,
    pub initializer_receive_token_account: Pubkey,
    pub initializer_amount: u64,
    pub taker_amount: u64
}

#[derive(Accounts)]
#[instruction(initializer_amount: u64)]
pub struct CreateEvent<'info> {
    pub initializer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    pub vault_account: Account<'info, TokenAccount>, // pda
    pub initializer_deposit_token_account: Account<'info, TokenAccount>,
    pub initializer_receive_token_account: Account<'info, TokenAccount>,
    pub escrow_account: Account<'info, EventAccount>,
    pub token_program: Program<'info, Token>
}
