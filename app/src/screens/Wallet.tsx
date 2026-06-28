import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import styles from './Wallet.module.css';

// Кошелёк: подключение TON-кошелька через TON Connect 2.0.
export function Wallet() {
  const wallet = useTonWallet();

  return (
    <div className={styles.wallet}>
      <span className="label-caps">кошелёк</span>
      <TonConnectButton />
      <p className={styles.hint}>
        {wallet === null
          ? 'Подключите TON-кошелёк, чтобы внести entry fee и получать выплаты.'
          : 'Кошелёк подключён. Депозит подтверждается после 1 блока.'}
      </p>
    </div>
  );
}
