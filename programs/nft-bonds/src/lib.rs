use std::collections::HashMap;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_lang::accounts::program::Program;

declare_id!("8LxVy5z37GBWNHwF45XBe3DT82qdbd9Zez2BCe3BrPw1");

#[program]
pub mod nft_bonds {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        let base_account = &mut ctx.accounts.base_account;
        base_account.events = Vec::new();

        Ok(())
    }

    pub fn try_transfer_nft(ctx: Context<TransferNFT>,) -> ProgramResult {
        let base_account = &mut ctx.accounts.base_account;
        let owner_user = &mut ctx.accounts.signer;
        let from = ctx.accounts.from.to_account_info();
        let to = ctx.accounts.to.to_account_info();

        let cpi_accounts = Transfer {
            from: from.clone(),
            to: to.clone(),
            authority: owner_user.to_account_info().clone()
        };

        let token_program = ctx.accounts.token_program.to_account_info();

        let cpi_ctx = CpiContext::new(token_program, cpi_accounts);
        token::transfer(cpi_ctx, 1)?;



        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 9000)]
    pub base_account: Account<'info, BaseAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program <'info, System>,
}


#[account]
pub struct BaseAccount {
    pub events: Vec<EventStruct>
}

#[derive(Accounts)]
pub struct TransferNFT<'info> {
    #[account(mut)]
    pub base_account: Account<'info, BaseAccount>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct EventStruct {
    pub title: String,
    pub owner: Pubkey,
    pub percent: u16,
    pub token: String,
    pub event_duration: u64,
    pub vesting_duration: u64
}
