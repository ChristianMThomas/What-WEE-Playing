import { Avatar } from "@/components/Avatar";
import type { AvatarLook } from "@/lib/avatar";
import { rollMark } from "@/lib/bowling/marks";
import { scoreGame, type GameConfig } from "@/lib/bowling/scoring";

/**
 * The bowler's score row, like Wii Sports': their face, then a column per frame
 * with the frame number on a blue header, the rolls in small boxes along the top
 * and the running total below. The last frame has room for three rolls when
 * standard scoring gives it bonus rolls.
 */
export function Scoreboard({
  look,
  username,
  rolls,
  config,
}: {
  look: AvatarLook;
  username: string;
  /** Rolls so far, one array per frame. */
  rolls: readonly (readonly number[])[];
  config: GameConfig;
}) {
  const card = scoreGame(rolls, config);
  const last = config.frameCount;
  const lastRolls = config.scoringMode === "standard" ? 3 : 2;

  return (
    <table className="border-separate border-spacing-0 text-white shadow-[0_6px_20px_rgb(0_0_0/0.35)]">
      <caption className="sr-only">{username}&apos;s scorecard</caption>
      <thead>
        <tr>
          <th scope="col" className="sr-only">
            Bowler
          </th>
          {card.frames.map((_, i) => (
            <th
              key={i}
              scope="col"
              className="border-x border-t-2 border-[#8fb4ff] bg-gradient-to-b from-[#2f6be0] to-[#1747b5] px-2 py-0.5 text-xl font-black sm:text-3xl"
            >
              {i + 1}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row" className="border-2 border-[#8fb4ff] bg-gradient-to-b from-[#58a6f0] to-[#2468c9] p-1">
            <span className="sr-only">{username}</span>
            {/* Just the face: the avatar canvas is cropped to its head. */}
            <span className="block size-12 overflow-hidden sm:size-16">
              <span className="-mx-[20%] -mt-[8%] block w-[140%]">
                <Avatar look={look} size={100} title="" />
              </span>
            </span>
          </th>
          {card.frames.map((frame, i) => {
            const slots = i + 1 === last ? lastRolls : 2;
            return (
              <td
                key={i}
                className={`border border-[#9a9a9a] bg-[#2a2a2a]/90 p-0 align-top ${slots === 3 ? "w-24 sm:w-32" : "w-16 sm:w-24"}`}
              >
                <div className="flex justify-end">
                  {Array.from({ length: slots }, (_, r) => (
                    <span
                      key={r}
                      className="flex h-6 w-6 items-center justify-center border-b border-l border-[#9a9a9a] text-sm font-bold sm:h-8 sm:w-8 sm:text-lg"
                    >
                      {rollMark(frame.rolls, r, i + 1 === last)}
                    </span>
                  ))}
                </div>
                <div className="flex h-7 items-center justify-center text-lg font-black sm:h-10 sm:text-2xl">
                  {frame.runningTotal ?? ""}
                </div>
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}
