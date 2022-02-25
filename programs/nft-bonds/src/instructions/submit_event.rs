use anchor_lang::prelude::*;
use anchor_lang::{solana_program};
use crate::state::*;

#[derive(Accounts)]
pub struct SubmitEvent<'info> {
    #[account(mut)]
    pub event_account: Account<'info, EventAccount>,
}

pub fn handler(
    ctx: Context<SubmitEvent>,
) -> ProgramResult {
    let event_account = &mut ctx.accounts.event_account;
    event_account.start_time = solana_program::clock::Clock::get().unwrap().unix_timestamp.clone() as i64;
    event_account.is_opened = true;

    Ok(())
}