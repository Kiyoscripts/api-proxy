"use client";

import { useState } from "react";
import { RedeemGiftCard } from "@/components/gift-cards/redeem-gift-card";

export function RedeemGiftCardModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn" type="button" onClick={() => setOpen(true)}>
        核销礼品卡 <span className="mono kbd">G</span>
      </button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal gift-card-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>核销礼品卡</h2>
              <button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label="关闭">×</button>
            </div>
            <div className="modal-body">
              <p className="dim">输入管理员发放的礼品卡卡号，核销成功后会增加到账户额度。</p>
              <RedeemGiftCard embedded />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
