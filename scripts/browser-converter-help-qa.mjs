// Shared assertions for the full- and semi-converter browser suites.
import assert from 'node:assert/strict';

export async function checkConverterHelp(page,widget,copy,index,complete=false,screenshot){
  const trigger=widget.locator('[data-conduction-help]');
  await trigger.click();
  const popup=page.locator('.conduction-help-popover');
  await popup.waitFor();
  await popup.evaluate(node=>Promise.all(node.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
  const stage=popup.locator('.conduction-help-stage'),expected=copy.stages[index];
  assert.equal(await stage.locator('h5').textContent(),copy.stageHeading);
  assert.equal(await stage.locator('[data-slot=badge]').textContent(),copy.pairs[index]);
  assert.equal(await stage.locator('p').textContent(),expected.explanation,'Retain the complete interval explanation');
  assert.deepEqual(await stage.locator('dt').allTextContents(),[copy.pathHeading,copy.relationHeading]);
  assert.deepEqual(await stage.locator('.conduction-help-route li>span').allTextContents(),expected.path.split(' → '),'Retain every current-path node in order');
  assert.equal(await stage.locator('.conduction-help-relation').textContent(),complete?copy.endRelation:expected.relation,'Retain endpoint limits and all instantaneous relations');
  const layout=await popup.evaluate(root=>{
    const body=root.querySelector('.conduction-help-body'),section=root.querySelector('.conduction-help-stage');
    return {width:innerWidth,height:innerHeight,popup:root.getBoundingClientRect().toJSON(),
      overflow:Math.max(root.scrollWidth-root.clientWidth,body.scrollWidth-body.clientWidth),
      sizes:[...section.querySelectorAll('dt,dd')].map(node=>({label:node.tagName==='DT',size:parseFloat(getComputedStyle(node).fontSize)})),
      route:[...section.querySelectorAll('li')].map(node=>({client:node.clientWidth,scroll:node.scrollWidth}))};
  });
  assert(layout.popup.x>=0&&layout.popup.y>=0&&layout.popup.right<=layout.width+1&&layout.popup.bottom<=layout.height+1,JSON.stringify(layout));
  assert(layout.overflow<=1,'Help scrolls vertically, never horizontally');
  assert(layout.sizes.every(node=>node.size>=(node.label?12:14)),'Keep labels and technical values readable');
  assert(layout.route.every(node=>node.scroll<=node.client+1),'Wrap paths between complete nodes, never clip a node');
  if(screenshot)await page.screenshot({path:screenshot});
  const body=popup.locator('.conduction-help-body');
  await body.focus();await page.keyboard.press('End');
  await body.evaluate(node=>node.scrollTop=node.scrollHeight);
  assert(await body.evaluate(node=>node.lastElementChild.getBoundingClientRect().bottom<=node.getBoundingClientRect().bottom+1),'All explanatory notes remain keyboard-scrollable');
  await page.keyboard.press('Escape');await popup.waitFor({state:'detached'});
  assert(await trigger.evaluate(node=>node===document.activeElement),'Closing help restores trigger focus');
}
