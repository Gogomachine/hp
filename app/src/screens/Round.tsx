import { Timer } from '../components/Timer.js';
import { CategoryPill } from '../components/CategoryPill.js';
import { PlayerRow } from '../components/PlayerRow.js';
import { Slider } from '../components/Slider.js';
import { useCountdown } from '../useCountdown.js';
import type { GameApi } from '../ws/useGame.js';
import styles from './Round.module.css';

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function qualityLabel(errorPct: number): string {
  if (errorPct < 0.08) return 'отличный прогноз';
  if (errorPct < 0.2) return 'хороший прогноз';
  if (errorPct < 0.4) return 'неплохо';
  return 'мимо';
}

export function Round({ game }: { game: GameApi }) {
  const round = game.round;
  // Хуки вызываем безусловно, до любого early-return (правила хуков React).
  const secondsLeft = useCountdown(
    round?.startedAt ?? 0,
    round?.durationSec ?? 0,
  );

  if (round === null) {
    return null;
  }
  const { question } = round;

  const opponents = game.players.filter(
    (p) => p.telegram_id !== game.myTelegramId,
  );

  return (
    <div className={styles.card}>
      {/* Шапка: раунд · таймер · счёт */}
      <header className={styles.header}>
        <span className="label-caps">
          раунд {round.number} / {round.roundCount}
        </span>
        <Timer secondsLeft={secondsLeft} durationSec={round.durationSec} />
        <span className={styles.scorePill}>+{game.totalScore}</span>
      </header>

      <CategoryPill category={question.category} />

      <h1 className={styles.question}>{question.text}</h1>

      {/* Противники */}
      <section>
        <span className="label-caps">противники</span>
        <div className={styles.opponents}>
          {opponents.map((p) => (
            <PlayerRow
              key={p.telegram_id}
              username={p.username}
              answered={round.opponentsAnswered.has(p.telegram_id)}
            />
          ))}
        </div>
      </section>

      <div className={styles.divider} />

      {/* Прогноз игрока */}
      <section>
        <div className={styles.predictHead}>
          <span className="label-caps">ваш прогноз</span>
          <span className={styles.value}>
            {formatValue(round.myValue)}
            <span className={styles.unit}> {question.unit}</span>
          </span>
        </div>

        <Slider
          min={question.range_min}
          max={question.range_max}
          value={round.myValue}
          disabled={round.submitted}
          onChange={game.setValue}
        />

        <div className={styles.scale}>
          <span>
            {formatValue(question.range_min)}
            {question.unit}
          </span>
          <span>
            {formatValue((question.range_min + question.range_max) / 2)}
            {question.unit}
          </span>
          <span>
            {formatValue(question.range_max)}
            {question.unit}
          </span>
        </div>
      </section>

      {/* Прогноз толпы */}
      <section className={styles.crowd}>
        <div className={styles.crowdHead}>
          <span className="label-caps">
            прогноз толпы {round.crowdRevealed ? '' : '(скрыт)'}
          </span>
          {!round.crowdRevealed && (
            <span className={styles.crowdHint}>откроется после</span>
          )}
        </div>
        <div className={styles.crowdBar}>
          {round.crowdRevealed && round.result !== null && (
            <div
              className={styles.crowdMarker}
              style={{
                left: `${
                  ((round.result.correctAnswer - question.range_min) /
                    (question.range_max - question.range_min)) *
                  100
                }%`,
              }}
            />
          )}
        </div>
        <span className={styles.crowdCaption}>
          {round.crowdRevealed && round.result !== null
            ? `правильный ответ: ${formatValue(round.result.correctAnswer)}${question.unit}`
            : 'распределение ответов других игроков'}
        </span>
      </section>

      {/* CTA */}
      <CtaButton game={game} secondsLeft={secondsLeft} />
    </div>
  );
}

function CtaButton({
  game,
  secondsLeft,
}: {
  game: GameApi;
  secondsLeft: number;
}) {
  const round = game.round!;

  if (round.result !== null) {
    return (
      <div className={styles.ctaWrap}>
        <button className={`${styles.cta} ${styles.ctaResult}`}>
          <span>
            +{round.result.points} pts — {qualityLabel(round.result.errorPct)}!
          </span>
          <span className={styles.ctaSub}>следующий раунд →</span>
        </button>
        <span className={styles.ctaArrow}>↓</span>
      </div>
    );
  }

  if (round.submitted) {
    return (
      <button className={`${styles.cta} ${styles.ctaWaiting}`} disabled>
        Прогноз принят · ждём остальных
      </button>
    );
  }

  return (
    <button
      className={`${styles.cta} ${styles.ctaActive}`}
      onClick={game.submit}
      disabled={secondsLeft <= 0}
    >
      Отправить прогноз
    </button>
  );
}
