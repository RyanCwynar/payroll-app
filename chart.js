const Chart = module.exports
const { CanvasRenderService } = require('chartjs-node-canvas');

const canvasRenderService = new CanvasRenderService(500,500, () => {})
 

Chart.getPieChart = async (data = [3,4,5,6]) => {
  const opts = {
    type: 'pie',
    data
  }
  try{
    const dataUrl = await canvasRenderService.renderToDataURL(opts);
    return dataUrl
  }
  catch(e){
    throw e
  }
}