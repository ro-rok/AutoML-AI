import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { FiHash, FiBarChart2, FiCheckSquare, FiCalendar, FiHelpCircle } from 'react-icons/fi'
import { SchemaColumn } from '../store/useSessionStore'
import { useVirtualScroll } from '../hooks/useVirtualScroll'

interface SchemaTableProps {
  schema: SchemaColumn[]
  targetColumn: string | null
  onTargetColumnChange: (column: string) => void
  suggestedTarget?: string | null
}

export default function SchemaTable({
  schema,
  targetColumn,
  onTargetColumnChange,
  suggestedTarget,
}: SchemaTableProps) {
  const tableRef = useRef<HTMLDivElement>(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  // Use virtual scrolling for large schemas (>300 columns)
  const useVirtualScrolling = schema.length > 300;
  const ITEM_HEIGHT = 60; // Approximate height of each row in pixels
  const CONTAINER_HEIGHT = 600; // Max height of scrollable container

  const { virtualItems, totalHeight, scrollRef } = useVirtualScroll({
    itemCount: schema.length,
    itemHeight: ITEM_HEIGHT,
    containerHeight: CONTAINER_HEIGHT,
    overscan: 5,
  });

  // Schema Snap animation on mount (only for non-virtual scrolling)
  useEffect(() => {
    if (!hasAnimated && schema.length > 0 && tableRef.current && !useVirtualScrolling) {
      const rows = tableRef.current.querySelectorAll('.schema-row')
      
      gsap.fromTo(
        rows,
        {
          opacity: 0,
          y: 20,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.05,
          ease: 'power2.out',
          delay: 0.2,
        }
      )
      
      setHasAnimated(true)
    }
  }, [schema, hasAnimated, useVirtualScrolling])

  const getTypeIcon = (type: SchemaColumn['inferredType']) => {
    switch (type) {
      case 'numerical':
        return <FiBarChart2 className="text-red-400" size={16} />
      case 'categorical':
        return <FiHash className="text-yellow-400" size={16} />
      case 'boolean':
        return <FiCheckSquare className="text-green-400" size={16} />
      case 'datetime':
        return <FiCalendar className="text-blue-400" size={16} />
      default:
        return <FiHelpCircle className="text-gray-400" size={16} />
    }
  }

  const getTypeColor = (type: SchemaColumn['inferredType']) => {
    switch (type) {
      case 'numerical':
        return 'text-red-400'
      case 'categorical':
        return 'text-yellow-400'
      case 'boolean':
        return 'text-green-400'
      case 'datetime':
        return 'text-blue-400'
      default:
        return 'text-gray-400'
    }
  }

  if (schema.length === 0) {
    return null
  }

  // Render a single schema row
  const renderRow = (col: SchemaColumn, index: number, style?: React.CSSProperties) => (
    <tr
      key={col.name}
      className={`
        schema-row border-b border-gray-800 transition-colors
        ${targetColumn === col.name ? 'bg-red-500/10 border-red-500/30' : 'hover:bg-gray-800/50'}
      `}
      style={useVirtualScrolling ? { ...style, display: 'table', width: '100%', tableLayout: 'fixed' } : { opacity: 0 }}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{col.name}</span>
          {targetColumn === col.name && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              Target
            </span>
          )}
          {suggestedTarget === col.name && targetColumn !== col.name && (
            <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full">
              Suggested
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {getTypeIcon(col.inferredType)}
          <span className={`capitalize ${getTypeColor(col.inferredType)}`}>
            {col.inferredType}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <code className="text-sm text-gray-400 bg-gray-800 px-2 py-1 rounded">
          {col.dtype}
        </code>
      </td>
      <td className="px-4 py-3">
        {col.nullCount > 0 ? (
          <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-sm rounded">
            {col.nullCount} ({((col.nullCount / (col.nullCount + 1)) * 100).toFixed(1)}%)
          </span>
        ) : (
          <span className="text-gray-500 text-sm">None</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2 text-sm text-gray-400">
          {col.sampleValues && col.sampleValues.length > 0 ? (
            col.sampleValues.slice(0, 3).map((val, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-gray-800 rounded truncate max-w-[100px]"
                title={String(val)}
              >
                {String(val)}
              </span>
            ))
          ) : (
            <span className="text-gray-600">No samples</span>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Dataset Schema</h2>
          <p className="text-gray-400">
            {schema.length} columns detected • {schema.filter(c => c.nullCount > 0).length} with missing values
          </p>
        </div>
        
        {/* Target Column Selector */}
        <div className="flex flex-col items-end gap-2">
          <label className="text-sm text-gray-400">Target Column</label>
          <select
            value={targetColumn || ''}
            onChange={(e) => onTargetColumnChange(e.target.value)}
            className="
              px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg
              text-white focus:outline-none focus:border-red-500
              focus:ring-2 focus:ring-red-500/20
              transition-all duration-200
            "
          >
            <option value="">Select target column...</option>
            {schema.map((col) => (
              <option key={col.name} value={col.name}>
                {col.name}
                {suggestedTarget === col.name ? ' (suggested)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Schema Table */}
      <div
        ref={tableRef}
        className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden"
      >
        {useVirtualScrolling ? (
          // Virtual scrolling for large schemas
          <div
            ref={scrollRef}
            className="overflow-auto"
            style={{ height: `${CONTAINER_HEIGHT}px` }}
          >
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-800 border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                    Column Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                    Pandas Dtype
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                    Missing
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                    Sample Values
                  </th>
                </tr>
              </thead>
              <tbody style={{ height: `${totalHeight}px`, position: 'relative' }}>
                {virtualItems.map((virtualItem) => {
                  const col = schema[virtualItem.index];
                  return renderRow(col, virtualItem.index, {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    transform: `translateY(${virtualItem.start}px)`,
                    height: `${virtualItem.size}px`,
                  });
                })}
              </tbody>
            </table>
          </div>
        ) : (
          // Regular rendering for small schemas
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800 border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                    Column Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                    Pandas Dtype
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                    Missing
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                    Sample Values
                  </th>
                </tr>
              </thead>
              <tbody>
                {schema.map((col, index) => renderRow(col, index))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Columns</div>
          <div className="text-2xl font-bold text-white">{schema.length}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Numerical</div>
          <div className="text-2xl font-bold text-red-400">
            {schema.filter(c => c.inferredType === 'numerical').length}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Categorical</div>
          <div className="text-2xl font-bold text-yellow-400">
            {schema.filter(c => c.inferredType === 'categorical').length}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">With Missing</div>
          <div className="text-2xl font-bold text-orange-400">
            {schema.filter(c => c.nullCount > 0).length}
          </div>
        </div>
      </div>
    </div>
  )
}
