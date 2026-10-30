import {
  ArrowDownloadRegular,
  ArrowImportRegular,
  ArrowLeftRegular,
  ArrowRepeatAllRegular,
  ArrowShuffleRegular,
  ArrowSwapRegular,
  ArrowUploadRegular,
  CheckmarkCircleRegular,
  CheckmarkRegular,
  ChevronRightRegular,
  CopyRegular,
  DataHistogramRegular,
  DeleteRegular,
  DismissRegular,
  EditRegular,
  ErrorCircleRegular,
  type FluentIcon as FluentIconComponent,
  HistoryRegular,
  HomeRegular,
  InfoRegular,
  LockClosedRegular,
  LockOpenRegular,
  PlayRegular,
  SportSoccerRegular,
  TrophyRegular,
  WarningRegular,
} from "@fluentui/react-icons";

/**
 * Same idea as web-app's FluentIcon, but with named imports so only the icons
 * listed here end up in the bundle. Add an entry to use a new icon.
 */
const ICONS = {
  ArrowDownload: ArrowDownloadRegular,
  ArrowImport: ArrowImportRegular,
  ArrowLeft: ArrowLeftRegular,
  ArrowRepeatAll: ArrowRepeatAllRegular,
  ArrowShuffle: ArrowShuffleRegular,
  ArrowSwap: ArrowSwapRegular,
  ArrowUpload: ArrowUploadRegular,
  Checkmark: CheckmarkRegular,
  CheckmarkCircle: CheckmarkCircleRegular,
  ChevronRight: ChevronRightRegular,
  Copy: CopyRegular,
  DataHistogram: DataHistogramRegular,
  Delete: DeleteRegular,
  Dismiss: DismissRegular,
  Edit: EditRegular,
  ErrorCircle: ErrorCircleRegular,
  History: HistoryRegular,
  Home: HomeRegular,
  Info: InfoRegular,
  LockClosed: LockClosedRegular,
  LockOpen: LockOpenRegular,
  Play: PlayRegular,
  SportSoccer: SportSoccerRegular,
  Trophy: TrophyRegular,
  Warning: WarningRegular,
} satisfies Record<string, FluentIconComponent>;

export type IconName = keyof typeof ICONS;

interface IFluentIconProps {
  name: IconName;
  size?: number;
  className?: string;
}

const FluentIcon = ({ name, size = 16, className }: IFluentIconProps) => {
  const Icon = ICONS[name];
  return <Icon fontSize={size} className={className} />;
};

export default FluentIcon;
