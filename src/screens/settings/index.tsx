import type { ReactNode } from "react";

import { Button } from "primereact/button";
import { InputSwitch } from "primereact/inputswitch";
import { SelectButton } from "primereact/selectbutton";
import { classNames } from "primereact/utils";

import { PageHeader } from "@/components";
import { useSettings } from "@/providers";
import { FluentIcon, SectionCard } from "@/ui";
import { TEXT_SIZES, THEMES } from "@/utils";

const Row = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) => (
  <div className="setting-row">
    <div className="min-w-0">
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-600">{hint}</div>
    </div>
    {children}
  </div>
);

/**
 * Settings of this device: the theme, the text size and what the app shows.
 * Every change applies at once and is remembered in the browser.
 */
const Settings = () => {
  const { settings, update, reset } = useSettings();

  return (
    <>
      <PageHeader
        title="Налаштування"
        subtitle="Зберігаються на цьому пристрої, в кожного свої"
      />
      <div className="grid">
        <div className="col-12">
          <SectionCard title="Тема">
            <div className="theme-tiles">
              {THEMES.map((theme) => (
                <Button
                  key={theme.id}
                  // The tile shows the theme's own colours (see main.css).
                  data-theme={theme.id}
                  className={classNames("theme-tile", {
                    "theme-tile--active": settings.theme === theme.id,
                  })}
                  aria-pressed={settings.theme === theme.id}
                  onClick={() => update({ theme: theme.id })}
                >
                  <span className="theme-tile__preview">
                    <span className="theme-tile__card">
                      <span className="theme-tile__dot theme-tile__dot--S" />
                      <span className="theme-tile__line" />
                      <span className="theme-tile__dot theme-tile__dot--V" />
                    </span>
                    <span className="theme-tile__accent" />
                  </span>
                  <span className="flex align-items-center justify-content-between gap-2 font-semibold">
                    {theme.label}
                    {settings.theme === theme.id && (
                      <FluentIcon name="Checkmark" size={16} />
                    )}
                  </span>
                </Button>
              ))}
            </div>
            <div className="text-sm text-600 mt-3">
              Червоний і синій завжди залишаються за S і V. Тема змінює колір
              кнопок, виділень і тла.
            </div>
          </SectionCard>
        </div>

        <div className="col-12 lg:col-6">
          <SectionCard title="Текст" className="h-full">
            <div className="flex flex-column gap-3">
              <div>
                <div className="font-semibold">Розмір тексту</div>
                <div className="text-sm text-600">
                  Більший текст зручніший на телефоні, менший вміщує більше на
                  екрані.
                </div>
              </div>
              <SelectButton
                value={settings.textSize}
                options={TEXT_SIZES.map(({ id, label }) => ({
                  label,
                  value: id,
                }))}
                allowEmpty={false}
                onChange={(e) => update({ textSize: e.value })}
              />
            </div>
          </SectionCard>
        </div>

        <div className="col-12 lg:col-6">
          <SectionCard title="Що показувати" className="h-full">
            <Row
              title="Анімація голів"
              hint="Мʼячі, що летять у ворота на табло турніру."
            >
              <InputSwitch
                checked={settings.goalAnimation}
                onChange={(e) => update({ goalAnimation: e.value })}
                aria-label="Анімація голів"
              />
            </Row>
            <Row
              title="Шанси та прогнози"
              hint="Шанс виходу в таблицях, шанси пар плей-офф, хто виграє турнір, що на кону в матчі."
            >
              <InputSwitch
                checked={settings.showChances}
                onChange={(e) => update({ showChances: e.value })}
                aria-label="Шанси та прогнози"
              />
            </Row>
            <Row
              title="Статистика з плей-офф"
              hint="Чи враховувати матчі плей-офф, коли відкривається статистика. На сторінці це можна перемкнути."
            >
              <InputSwitch
                checked={settings.includePlayoff}
                onChange={(e) => update({ includePlayoff: e.value })}
                aria-label="Статистика з плей-офф"
              />
            </Row>
          </SectionCard>
        </div>

        <div className="col-12">
          <Button
            label="Скинути налаштування"
            icon={<FluentIcon name="ArrowRepeatAll" />}
            outlined
            severity="secondary"
            onClick={reset}
          />
        </div>
      </div>
    </>
  );
};

export default Settings;
