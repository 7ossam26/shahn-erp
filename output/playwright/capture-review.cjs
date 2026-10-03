async page => {
  const captures = [];
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  for (const viewport of [{width:1440,height:1050,name:'desktop'}, {width:390,height:844,name:'mobile'}]) {
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    for (const screen of [{name:'home',route:'/'},{name:'inventory',route:'/inventory'},{name:'detail',route:'/shipment/10428'}]) {
      await page.goto('http://127.0.0.1:4173/#' + screen.route);
      await page.locator('h1').waitFor();
      if (screen.name === 'inventory') await page.locator('.view-switch button').first().click();
      await page.evaluate(() => document.fonts.ready);
      const dimensions = await page.evaluate(() => ({viewport:innerWidth, document:document.documentElement.scrollWidth, direction:document.documentElement.dir, theme:document.documentElement.dataset.theme}));
      await page.screenshot({path:`output/playwright/${screen.name}-${viewport.name}.png`,fullPage:true,scale:'css'});
      captures.push({screen:screen.name,...viewport,...dimensions});
    }
  }
  console.log(JSON.stringify({captures,runtimeErrors}));
}
