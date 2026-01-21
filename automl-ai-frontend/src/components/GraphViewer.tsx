// src/components/GraphViewer.tsx
import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION, SPRING } from '../utils/motionConstants';

type GraphType = 'correlation' | 'histogram' | 'scatter' | 'confusion_matrix' | 'roc_curve' | 'feature_importance';

interface GraphViewerProps {
  type: GraphType;
  data: any;
  title?: string;
  isModal?: boolean;
  onClose?: () => void;
}

export default function GraphViewer({ type, data, title, isModal = false, onClose }: GraphViewerProps) {
  const [option, setOption] = useState<any>(null);

  useEffect(() => {
    const chartOption = generateChartOption(type, data, title);
    setOption(chartOption);
  }, [type, data, title]);

  if (!option) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <svg className="animate-spin h-8 w-8 text-red-500" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  const content = (
    <div className={isModal ? 'w-full h-full' : 'w-full'}>
      <ReactECharts
        option={option}
        style={{ height: isModal ? '100%' : '400px', width: '100%' }}
        theme="dark"
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );

  if (isModal) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.fast }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={SPRING.default}
            className="relative w-[90vw] h-[90vh] bg-gray-900 rounded-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {title && <h3 className="text-xl font-semibold mb-4 text-white">{title}</h3>}
            {content}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return content;
}

function generateChartOption(type: GraphType, data: any, title?: string): any {
  const darkTheme = {
    backgroundColor: 'transparent',
    textStyle: {
      color: '#a1a1a1',
    },
    title: {
      textStyle: {
        color: '#ffffff',
      },
    },
    legend: {
      textStyle: {
        color: '#a1a1a1',
      },
    },
    grid: {
      borderColor: '#2a2a2a',
    },
  };

  switch (type) {
    case 'correlation':
      return generateCorrelationHeatmap(data, title, darkTheme);
    case 'histogram':
      return generateHistogram(data, title, darkTheme);
    case 'scatter':
      return generateScatterPlot(data, title, darkTheme);
    case 'confusion_matrix':
      return generateConfusionMatrix(data, title, darkTheme);
    case 'roc_curve':
      return generateROCCurve(data, title, darkTheme);
    case 'feature_importance':
      return generateFeatureImportance(data, title, darkTheme);
    default:
      return {};
  }
}

function generateCorrelationHeatmap(data: any, title?: string, theme?: any): any {
  const { correlations, columns } = data;

  // Convert correlation matrix to heatmap data format
  const heatmapData: any[] = [];
  for (let i = 0; i < correlations.length; i++) {
    for (let j = 0; j < correlations[i].length; j++) {
      heatmapData.push([j, i, correlations[i][j].toFixed(2)]);
    }
  }

  return {
    ...theme,
    title: {
      text: title || 'Correlation Heatmap',
      left: 'center',
      ...theme?.title,
    },
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        return `${columns[params.data[0]]} vs ${columns[params.data[1]]}<br/>Correlation: ${params.data[2]}`;
      },
    },
    grid: {
      height: '70%',
      top: '10%',
      left: '15%',
    },
    xAxis: {
      type: 'category',
      data: columns,
      splitArea: {
        show: true,
      },
      axisLabel: {
        rotate: 45,
        color: '#a1a1a1',
      },
    },
    yAxis: {
      type: 'category',
      data: columns,
      splitArea: {
        show: true,
      },
      axisLabel: {
        color: '#a1a1a1',
      },
    },
    visualMap: {
      min: -1,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'],
      },
      textStyle: {
        color: '#a1a1a1',
      },
    },
    series: [
      {
        name: 'Correlation',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          color: '#ffffff',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };
}

function generateHistogram(data: any, title?: string, theme?: any): any {
  const { values, bins } = data;

  return {
    ...theme,
    title: {
      text: title || 'Distribution',
      left: 'center',
      ...theme?.title,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    xAxis: {
      type: 'category',
      data: bins,
      axisLabel: {
        color: '#a1a1a1',
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#a1a1a1',
      },
    },
    series: [
      {
        name: 'Frequency',
        type: 'bar',
        data: values,
        itemStyle: {
          color: '#ef4444',
        },
      },
    ],
  };
}

function generateScatterPlot(data: any, title?: string, theme?: any): any {
  const { x, y, xLabel, yLabel } = data;

  const scatterData = x.map((xVal: number, idx: number) => [xVal, y[idx]]);

  return {
    ...theme,
    title: {
      text: title || 'Scatter Plot',
      left: 'center',
      ...theme?.title,
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `${xLabel}: ${params.data[0]}<br/>${yLabel}: ${params.data[1]}`;
      },
    },
    xAxis: {
      type: 'value',
      name: xLabel,
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: {
        color: '#a1a1a1',
      },
    },
    yAxis: {
      type: 'value',
      name: yLabel,
      nameLocation: 'middle',
      nameGap: 40,
      axisLabel: {
        color: '#a1a1a1',
      },
    },
    series: [
      {
        type: 'scatter',
        data: scatterData,
        itemStyle: {
          color: '#ef4444',
        },
      },
    ],
  };
}

function generateConfusionMatrix(data: any, title?: string, theme?: any): any {
  const { matrix, labels } = data;

  // Convert matrix to heatmap format
  const heatmapData: any[] = [];
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      heatmapData.push([j, i, matrix[i][j]]);
    }
  }

  return {
    ...theme,
    title: {
      text: title || 'Confusion Matrix',
      left: 'center',
      ...theme?.title,
    },
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        return `Predicted: ${labels[params.data[0]]}<br/>Actual: ${labels[params.data[1]]}<br/>Count: ${params.data[2]}`;
      },
    },
    grid: {
      height: '70%',
      top: '15%',
    },
    xAxis: {
      type: 'category',
      data: labels,
      name: 'Predicted',
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: {
        color: '#a1a1a1',
      },
    },
    yAxis: {
      type: 'category',
      data: labels,
      name: 'Actual',
      nameLocation: 'middle',
      nameGap: 40,
      axisLabel: {
        color: '#a1a1a1',
      },
    },
    visualMap: {
      min: 0,
      max: Math.max(...heatmapData.map((d) => d[2])),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027'],
      },
      textStyle: {
        color: '#a1a1a1',
      },
    },
    series: [
      {
        name: 'Confusion Matrix',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          color: '#ffffff',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };
}

function generateROCCurve(data: any, title?: string, theme?: any): any {
  const { fpr, tpr, auc } = data;

  const rocData = fpr.map((fprVal: number, idx: number) => [fprVal, tpr[idx]]);

  return {
    ...theme,
    title: {
      text: title || `ROC Curve (AUC = ${auc.toFixed(3)})`,
      left: 'center',
      ...theme?.title,
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'value',
      name: 'False Positive Rate',
      nameLocation: 'middle',
      nameGap: 30,
      min: 0,
      max: 1,
      axisLabel: {
        color: '#a1a1a1',
      },
    },
    yAxis: {
      type: 'value',
      name: 'True Positive Rate',
      nameLocation: 'middle',
      nameGap: 40,
      min: 0,
      max: 1,
      axisLabel: {
        color: '#a1a1a1',
      },
    },
    series: [
      {
        name: 'ROC',
        type: 'line',
        data: rocData,
        smooth: true,
        itemStyle: {
          color: '#ef4444',
        },
        lineStyle: {
          width: 2,
        },
      },
      {
        name: 'Random',
        type: 'line',
        data: [
          [0, 0],
          [1, 1],
        ],
        lineStyle: {
          type: 'dashed',
          color: '#6b6b6b',
        },
      },
    ],
  };
}

function generateFeatureImportance(data: any, title?: string, theme?: any): any {
  const { features, importance } = data;

  // Sort by importance
  const sorted = features
    .map((feature: string, idx: number) => ({ feature, importance: importance[idx] }))
    .sort((a: any, b: any) => b.importance - a.importance)
    .slice(0, 20); // Top 20 features

  return {
    ...theme,
    title: {
      text: title || 'Feature Importance',
      left: 'center',
      ...theme?.title,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        color: '#a1a1a1',
      },
    },
    yAxis: {
      type: 'category',
      data: sorted.map((d: any) => d.feature),
      axisLabel: {
        color: '#a1a1a1',
      },
    },
    series: [
      {
        name: 'Importance',
        type: 'bar',
        data: sorted.map((d: any) => d.importance),
        itemStyle: {
          color: '#ef4444',
        },
      },
    ],
  };
}
