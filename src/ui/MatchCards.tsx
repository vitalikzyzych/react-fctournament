import { useState } from "react";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { classNames } from "primereact/utils";

import ClubLabel from "./ClubLabel";
import FluentIcon from "./FluentIcon";

import {
  type CardType,
  type ICard,
  type IClub,
  type IDiscipline,
  type IMatch,
  matchCards,
  MAX_PLAYER_NAME,
  newCardId,
  playerKey,
  SUSPENSION_REASONS,
} from "@/domain";

interface IMatchCardsProps {
  match: IMatch;
  clubsById: Map<string, IClub>;
  discipline: IDiscipline;
  /** Cards can be added and removed (a stored match of an active tournament). */
  editable: boolean;
  onAdd?: (cards: ICard[]) => void;
  onRemove?: (card: ICard) => void;
}

const CARD_LABELS: Record<CardType, string> = {
  yellow: "Жовта",
  red: "Червона",
};

const CardIcon = ({ type }: { type: CardType }) => (
  <span
    className={classNames("card-icon", `card-icon--${type}`)}
    aria-label={`${CARD_LABELS[type]} картка`}
  />
);

interface IAddCardsDialogProps {
  match: IMatch;
  clubsById: Map<string, IClub>;
  playersByClub: Map<string, string[]>;
  onAdd: (cards: ICard[]) => void;
  onHide: () => void;
}

/** Known names shown as one-tap buttons per club, at most. */
const MAX_QUICK_PICKS = 8;

/**
 * Several cards at once. Both clubs side by side: type a name and press
 * Enter (or tap a footballer booked before) to add a yellow; the card icon
 * of a pending card switches it to red and back. One save for all of them.
 */
const AddCardsDialog = ({
  match,
  clubsById,
  playersByClub,
  onAdd,
  onHide,
}: IAddCardsDialogProps) => {
  const [pending, setPending] = useState<ICard[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const add = (club: string, player: string) => {
    const name = player.trim().replace(/\s+/g, " ").slice(0, MAX_PLAYER_NAME);
    if (!name) return;
    setPending((list) => [
      ...list,
      { id: newCardId(), club, player: name, type: "yellow" },
    ]);
    setNames((current) => ({ ...current, [club]: "" }));
  };

  const toggle = (id: string) =>
    setPending((list) =>
      list.map((card) =>
        card.id === id
          ? { ...card, type: card.type === "yellow" ? "red" : "yellow" }
          : card
      )
    );

  const remove = (id: string) =>
    setPending((list) => list.filter((card) => card.id !== id));

  const save = () => {
    if (!pending.length) return;
    onAdd(pending);
    onHide();
  };

  const side = (clubId: string, autoFocus: boolean) => {
    const club = clubsById.get(clubId);
    const typed = names[clubId] ?? "";
    const query = playerKey(typed);
    const own = pending.filter((card) => card.club === clubId);
    // Cards this match already has, in their real colour, for reference.
    const saved = matchCards(match).filter((card) => card.club === clubId);
    // Footballers booked before, minus those who already have a card in this
    // match (saved or about to be added); a typed name still adds them.
    const booked = new Set([...saved, ...own].map((c) => playerKey(c.player)));
    const quick = (playersByClub.get(clubId) ?? [])
      .filter(
        (known) =>
          !booked.has(playerKey(known)) && playerKey(known).includes(query)
      )
      .slice(0, MAX_QUICK_PICKS);
    return (
      <div className="col-12 md:col-6 flex flex-column gap-2">
        <ClubLabel
          name={club?.name ?? clubId}
          clubId={clubId}
          owner={club?.owner}
          bold
        />
        <div className="flex gap-2">
          <InputText
            value={typed}
            onChange={(e) =>
              setNames((current) => ({ ...current, [clubId]: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") add(clubId, typed);
            }}
            maxLength={MAX_PLAYER_NAME}
            placeholder="Імʼя гравця"
            aria-label={`Гравець ${club?.name ?? clubId}`}
            autoFocus={autoFocus}
            className="flex-1 min-w-0"
          />
          <Button
            icon={<FluentIcon name="Add" size={18} />}
            disabled={!typed.trim()}
            outlined
            aria-label="Додати жовту"
            tooltip="Додати жовту"
            tooltipOptions={{ position: "top" }}
            className="card-add-button"
            onClick={() => add(clubId, typed)}
          />
        </div>
        {saved.length > 0 && (
          <div className="flex flex-wrap align-items-center gap-2 text-xs">
            <span className="text-500">Уже в матчі:</span>
            {saved.map((card) => (
              <span key={card.id} className="card-chip">
                <CardIcon type={card.type} />
                {card.player}
              </span>
            ))}
          </div>
        )}
        {quick.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {quick.map((known) => (
              <Button
                key={known}
                label={known}
                icon={<FluentIcon name="Add" size={14} />}
                size="small"
                outlined
                severity="secondary"
                className="card-quick"
                onClick={() => add(clubId, known)}
              />
            ))}
          </div>
        )}
        {own.map((card) => (
          <span key={card.id} className="card-chip card-chip--pending">
            <Button
              icon={<CardIcon type={card.type} />}
              rounded
              text
              className="card-chip__toggle"
              aria-label={
                card.type === "yellow" ? "Зробити червоною" : "Зробити жовтою"
              }
              tooltip={card.type === "yellow" ? "Червона" : "Жовта"}
              tooltipOptions={{ position: "top" }}
              onClick={() => toggle(card.id)}
            />
            <span className="flex-1 min-w-0 white-space-nowrap overflow-hidden text-overflow-ellipsis">
              {card.player}
            </span>
            <span className="text-500 text-xs">
              {CARD_LABELS[card.type].toLowerCase()}
            </span>
            <Button
              icon={<FluentIcon name="Dismiss" size={14} />}
              rounded
              text
              severity="secondary"
              className="card-chip__remove"
              aria-label={`Прибрати: ${card.player}`}
              onClick={() => remove(card.id)}
            />
          </span>
        ))}
      </div>
    );
  };

  return (
    <Dialog
      visible
      onHide={onHide}
      showHeader={false}
      dismissableMask
      className="w-full mx-3 dialog-wide"
      contentClassName="border-round-xl p-4 relative"
    >
      <Button
        icon={<FluentIcon name="Dismiss" size={20} />}
        rounded
        text
        severity="secondary"
        onClick={onHide}
        aria-label="Закрити"
        className="absolute top-0 right-0 mt-2 mr-2"
      />
      <h2 className="m-0 mb-1 text-xl font-bold pr-5">Картки</h2>
      <p className="m-0 mb-3 text-600 text-sm">
        Введіть імʼя гравця і натисніть Enter або +: він отримає жовту.
        Натисніть на картку, щоб зробити її червоною.
      </p>
      <div className="grid">
        {side(match.home, true)}
        {side(match.away, false)}
      </div>
      <div className="flex justify-content-end gap-2 mt-3">
        <Button label="Скасувати" text severity="secondary" onClick={onHide} />
        <Button
          label={pending.length ? `Додати (${pending.length})` : "Додати"}
          icon={<FluentIcon name="Checkmark" />}
          disabled={!pending.length}
          onClick={save}
        />
      </div>
    </Dialog>
  );
};

/**
 * Cards of one match and the footballers who miss it because of earlier
 * cards (see computeDiscipline). Renders nothing when there is nothing to
 * show or add.
 */
const MatchCards = ({
  match,
  clubsById,
  discipline,
  editable,
  onAdd,
  onRemove,
}: IMatchCardsProps) => {
  const [isAdding, setAdding] = useState(false);
  const cards = matchCards(match);
  const missing = discipline.suspensions.get(match.id) ?? [];
  const canEdit = editable && onAdd !== undefined;
  if (!cards.length && !missing.length && !canEdit) return null;

  const clubName = (id: string) => clubsById.get(id)?.name ?? id;

  return (
    <div className="flex flex-column gap-2">
      {missing.length > 0 && (
        <div className="match-missing">
          <FluentIcon name="PersonProhibited" size={16} />
          <span>
            Пропускає матч:{" "}
            {missing.map((s, index) => (
              <span key={`${s.club}:${s.player}`}>
                {index > 0 && "; "}
                <b>{s.player}</b> ({clubName(s.club)}),{" "}
                {SUSPENSION_REASONS[s.reason]}
              </span>
            ))}
          </span>
        </div>
      )}
      {(cards.length > 0 || canEdit) && (
        <div className="flex flex-wrap align-items-center gap-2">
          {cards.map((card) => (
            <span key={card.id} className="card-chip">
              <CardIcon type={card.type} />
              <span className="white-space-nowrap">{card.player}</span>
              <span className="text-500 white-space-nowrap">
                {clubName(card.club)}
              </span>
              {canEdit && onRemove && (
                <Button
                  icon={<FluentIcon name="Dismiss" size={14} />}
                  rounded
                  text
                  severity="secondary"
                  className="card-chip__remove"
                  aria-label={`Видалити картку: ${card.player}`}
                  onClick={() => onRemove(card)}
                />
              )}
            </span>
          ))}
          {canEdit && (
            <Button
              label="Картки"
              icon={<FluentIcon name="Add" size={14} />}
              text
              size="small"
              className="card-add"
              onClick={() => setAdding(true)}
            />
          )}
        </div>
      )}
      {isAdding && onAdd && (
        <AddCardsDialog
          match={match}
          clubsById={clubsById}
          playersByClub={discipline.playersByClub}
          onAdd={onAdd}
          onHide={() => setAdding(false)}
        />
      )}
    </div>
  );
};

export default MatchCards;
