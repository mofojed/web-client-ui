import findFocusedPanelId from '../findFocusedPanelId';

beforeEach(() => {
  expect.hasAssertions();
});

function buildDom(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container.firstElementChild as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('findFocusedPanelId', () => {
  it('returns the closest enclosing panel-content id', () => {
    const dashboard = buildDom(`
      <div class="dh-layout">
        <div class="dh-layout-stack">
          <div class="dh-layout-stack-content">
            <div class="dh-layout-panel-content" data-panel-id="p1">
              <input id="focused" />
            </div>
          </div>
        </div>
      </div>
    `);
    const focused = dashboard.querySelector('#focused') as Element;
    expect(findFocusedPanelId(focused, dashboard)).toBe('p1');
  });

  it('returns null when focus is outside the dashboard', () => {
    const dashboard = buildDom(`
      <div class="dh-layout">
        <div class="dh-layout-panel-content" data-panel-id="p1"></div>
      </div>
    `);
    const outside = document.createElement('input');
    document.body.appendChild(outside);
    expect(findFocusedPanelId(outside, dashboard)).toBeNull();
  });

  it('returns null when focus is in a tab strip but not in any panel content', () => {
    const dashboard = buildDom(`
      <div class="dh-layout">
        <div class="dh-layout-stack">
          <div class="dh-layout-tabs">
            <button class="dh-layout-tab" data-panel-id="p1" id="tab-button"></button>
          </div>
          <div class="dh-layout-stack-content">
            <div class="dh-layout-panel-content" data-panel-id="p1"></div>
          </div>
        </div>
      </div>
    `);
    const tab = dashboard.querySelector('#tab-button') as Element;
    expect(findFocusedPanelId(tab, dashboard)).toBeNull();
  });

  it('returns the inner panel id when focus is inside a nested dashboard', () => {
    const outer = buildDom(`
      <div class="dh-layout" id="outer">
        <div class="dh-layout-stack">
          <div class="dh-layout-stack-content">
            <div class="dh-layout-panel-content" data-panel-id="outer-1">
              <div class="dh-layout is-nested" id="inner">
                <div class="dh-layout-stack">
                  <div class="dh-layout-stack-content">
                    <div class="dh-layout-panel-content" data-panel-id="inner-1">
                      <input id="focused" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    const inner = outer.querySelector('#inner') as HTMLElement;
    const focused = outer.querySelector('#focused') as Element;
    expect(findFocusedPanelId(focused, inner)).toBe('inner-1');
  });

  it('returns null on the outer dashboard when focus is in a nested dashboard', () => {
    const outer = buildDom(`
      <div class="dh-layout" id="outer">
        <div class="dh-layout-stack">
          <div class="dh-layout-stack-content">
            <div class="dh-layout-panel-content" data-panel-id="outer-1">
              <div class="dh-layout is-nested" id="inner">
                <div class="dh-layout-stack">
                  <div class="dh-layout-stack-content">
                    <div class="dh-layout-panel-content" data-panel-id="inner-1">
                      <input id="focused" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    const focused = outer.querySelector('#focused') as Element;
    expect(findFocusedPanelId(focused, outer)).toBeNull();
  });
});
