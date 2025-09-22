import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AnimatePresence } from './AnimatePresenceWrapper';
import {
    ComposedChart,
    BarChart,
    LineChart,
    PieChart,
    Cell,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
    RadialBarChart,
    RadialBar,
    Pie,
    Legend
} from 'recharts';
import {
    Activity,
    Database,
    Clock,
    Zap,
    TrendingUp,
    BarChart3,
    PieChart as PieChartIcon,
    // Timeline, // Not available in current lucide-react version
    Eye,
    Grid,
    Hash,
    Users,
    Layers,
    Target
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Block, NetworkStats } from '../types';

interface BlockVisualizationProps {
    blocks: Block[];
    networkStats?: NetworkStats;
    timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
    showInteractive?: boolean;
}

interface BlockChartData {
    timestamp: number;
    blockNumber: number;
    deploymentCount: number;
    timeSinceLastBlock: number;
    proposer: string;
    formattedTime: string;
    blockSize?: number;
    gasUsed?: number;
}

interface ProposerData {
    proposer: string;
    blockCount: number;
    percentage: number;
    color: string;
}

interface TimeSeriesData {
    time: string;
    timestamp: number;
    blockTime: number;
    deployments: number;
    avgBlockTime: number;
}

const BlockVisualization: React.FC<BlockVisualizationProps> = ({
                                                                   blocks,
                                                                   networkStats,
                                                                   timeRange = '24h',
                                                                   showInteractive = true
                                                               }) => {
    const [selectedView, setSelectedView] = useState<'timeline' | 'proposers' | 'activity' | 'network'>('timeline');
    const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
    const [hoveredData, setHoveredData] = useState<any>(null);

    // Process block data for charts
    const chartData = useMemo(() => {
        const sortedBlocks = [...blocks].sort((a, b) => a.timestamp - b.timestamp);

        return sortedBlocks.map((block, index) => {
            const prevBlock = sortedBlocks[index - 1];
            const timeSinceLastBlock = prevBlock
                ? block.timestamp - prevBlock.timestamp
                : 0;

            return {
                timestamp: block.timestamp,
                blockNumber: block.block_number,
                deploymentCount: block.deployment_count || 0,
                timeSinceLastBlock: timeSinceLastBlock / 1000, // Convert to seconds
                proposer: block.proposer,
                formattedTime: format(new Date(block.timestamp), 'HH:mm:ss'),
                blockSize: block.deployment_count * 250 + 500, // Estimated based on deployments
                gasUsed: block.deployment_count * 25000 + 50000 // Estimated based on deployments
            } as BlockChartData;
        });
    }, [blocks]);

    // Process proposer distribution data
    const proposerData = useMemo(() => {
        const proposerCounts = blocks.reduce((acc, block) => {
            const proposer = block.proposer.slice(0, 8) + '...';
            acc[proposer] = (acc[proposer] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

        return Object.entries(proposerCounts)
            .map(([proposer, count], index) => ({
                proposer,
                blockCount: count,
                percentage: (count / blocks.length) * 100,
                color: colors[index % colors.length]
            }))
            .sort((a, b) => b.blockCount - a.blockCount);
    }, [blocks]);

    // Process time series data
    const timeSeriesData = useMemo(() => {
        const sortedBlocks = [...blocks].sort((a, b) => a.timestamp - b.timestamp);
        const groupedData: Record<string, { blocks: Block[], totalDeployments: number }> = {};

        // Group blocks by hour
        sortedBlocks.forEach(block => {
            const hourKey = format(new Date(block.timestamp), 'yyyy-MM-dd HH:00');
            if (!groupedData[hourKey]) {
                groupedData[hourKey] = { blocks: [], totalDeployments: 0 };
            }
            groupedData[hourKey].blocks.push(block);
            groupedData[hourKey].totalDeployments += block.deployment_count || 0;
        });

        return Object.entries(groupedData).map(([time, data]) => {
            const avgBlockTime = data.blocks.length > 1
                ? data.blocks.reduce((acc, block, index) => {
                if (index === 0) return acc;
                return acc + (block.timestamp - data.blocks[index - 1].timestamp);
            }, 0) / (data.blocks.length - 1) / 1000
                : 0;

            return {
                time: format(parseISO(time), 'HH:mm'),
                timestamp: parseISO(time).getTime(),
                blockTime: avgBlockTime,
                deployments: data.totalDeployments,
                avgBlockTime: avgBlockTime,
                blockCount: data.blocks.length
            };
        }).sort((a, b) => a.timestamp - b.timestamp);
    }, [blocks]);

    // Custom tooltip components
    const BlockTimelineTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="asi-card" style={{
                    padding: '1rem',
                    minWidth: '200px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(0, 0, 0, 0.9)'
                }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>
                        Block #{data.blockNumber}
                    </p>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#d1d5db' }}>
                        Time: {data.formattedTime}
                    </p>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#d1d5db' }}>
                        Deployments: {data.deploymentCount}
                    </p>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#d1d5db' }}>
                        Block Time: {data.timeSinceLastBlock.toFixed(1)}s
                    </p>
                    <p style={{ margin: '0', fontSize: '0.875rem', color: '#d1d5db' }}>
                        Proposer: {data.proposer.slice(0, 12)}...
                    </p>
                </div>
            );
        }
        return null;
    };

    const NetworkActivityTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="asi-card" style={{
                    padding: '1rem',
                    minWidth: '200px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(0, 0, 0, 0.9)'
                }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>
                        {label}
                    </p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{
                            margin: '0 0 0.25rem 0',
                            fontSize: '0.875rem',
                            color: entry.color
                        }}>
                            {entry.name}: {entry.value}
                            {entry.name.includes('Time') && 's'}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const renderTimelineView = () => (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Activity size={20} />
                    Block Timeline & Performance
                </h3>

                <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis
                            dataKey="formattedTime"
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                        />
                        <YAxis
                            yAxisId="left"
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                        />
                        <Tooltip content={<BlockTimelineTooltip />} />
                        <Bar
                            yAxisId="left"
                            dataKey="deploymentCount"
                            fill="#10b981"
                            opacity={0.7}
                            name="Deployments"
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="timeSinceLastBlock"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                            name="Block Time (s)"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Block Grid Visualization */}
            <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ marginBottom: '1rem' }}>Recent Blocks Grid</h4>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                    gap: '0.5rem',
                    maxHeight: '200px',
                    overflow: 'auto'
                }}>
                    {blocks.slice(0, 50).map((block, index) => (
                        <motion.div
                            key={block.block_number}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.02 }}
                            whileHover={{ scale: 1.1, zIndex: 10 }}
                            onClick={() => setSelectedBlock(block)}
                            style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '8px',
                                backgroundColor: `hsl(${(block.deployment_count * 30) % 360}, 60%, 50%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#000',
                                position: 'relative',
                                opacity: block.deployment_count > 0 ? 1 : 0.3
                            }}
                            title={`Block #${block.block_number} - ${block.deployment_count} deployments`}
                        >
                            {block.block_number}
                            {block.deployment_count > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    backgroundColor: '#ef4444',
                                    color: '#fff',
                                    fontSize: '0.6rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {block.deployment_count}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderProposersView = () => (
        <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                <PieChartIcon size={20} />
                Validator Distribution
            </h3>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '2rem',
                marginBottom: '2rem'
            }}>
                {/* Pie Chart */}
                <div>
                    <h4 style={{ marginBottom: '1rem' }}>Block Proposer Distribution</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={proposerData}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                dataKey="blockCount"
                                label={(p: any) => `${(p?.payload?.percentage ?? 0).toFixed(1)}%`}
                                // label={(p: any) => {console.log("P ", p); return `${(p.percent ? p.percent * 100 : p.payload?.percentage ?? 0).toFixed(1)}%`}}
                            >
                                {proposerData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: any, name: any, props: any) => [
                                    `${value} blocks (${props.payload.percentage.toFixed(1)}%)`,
                                    props.payload.proposer
                                ]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Radial Bar Chart */}
                <div>
                    <h4 style={{ marginBottom: '1rem' }}>Validator Performance</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="20%"
                            outerRadius="80%"
                            data={proposerData.slice(0, 5)}
                        >
                            <RadialBar
                                dataKey="percentage"
                                cornerRadius={10}
                                fill="#10b981"
                            />
                            <Tooltip
                                formatter={(value: any, name: any, props: any) => [
                                    `${props.payload.blockCount} blocks`,
                                    props.payload.proposer
                                ]}
                            />
                        </RadialBarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Proposer List */}
            <div>
                <h4 style={{ marginBottom: '1rem' }}>Detailed Validator Statistics</h4>
                <div className="asi-card">
                    <div style={{ overflow: 'auto' }}>
                        <table style={{ width: '100%' }}>
                            <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Validator</th>
                                <th style={{ textAlign: 'right', padding: '0.75rem' }}>Blocks</th>
                                <th style={{ textAlign: 'right', padding: '0.75rem' }}>Share</th>
                                <th style={{ textAlign: 'right', padding: '0.75rem' }}>Performance</th>
                            </tr>
                            </thead>
                            <tbody>
                            {proposerData.map((proposer, index) => (
                                <tr key={proposer.proposer} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <td style={{ padding: '1rem 0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div
                                                style={{
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '50%',
                                                    backgroundColor: proposer.color
                                                }}
                                            />
                                            <span style={{ fontFamily: 'monospace' }}>{proposer.proposer}</span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '1rem 0.75rem' }}>
                                        {proposer.blockCount}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '1rem 0.75rem' }}>
                                        {proposer.percentage.toFixed(2)}%
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '1rem 0.75rem' }}>
                                        <div style={{
                                            width: '100px',
                                            height: '8px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: '4px',
                                            overflow: 'hidden',
                                            display: 'inline-block'
                                        }}>
                                            <div style={{
                                                width: `${proposer.percentage}%`,
                                                height: '100%',
                                                backgroundColor: proposer.color,
                                                borderRadius: '4px'
                                            }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderActivityView = () => (
        <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                <Activity size={20} />
                Network Activity Analysis
            </h3>

            {/* Time Series Charts */}
            <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ marginBottom: '1rem' }}>Block Time Trends</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis
                            dataKey="time"
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                        />
                        <Tooltip content={<NetworkActivityTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="avgBlockTime"
                            stroke="#3b82f6"
                            fill="#3b82f620"
                            strokeWidth={2}
                            name="Avg Block Time"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ marginBottom: '1rem' }}>Deployment Activity</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis
                            dataKey="time"
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                        />
                        <Tooltip content={<NetworkActivityTooltip />} />
                        <Bar
                            dataKey="deployments"
                            fill="#10b981"
                            opacity={0.8}
                            name="Deployments"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Activity Heatmap */}
            <div>
                <h4 style={{ marginBottom: '1rem' }}>Activity Heatmap</h4>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(24, 1fr)',
                    gap: '2px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: '1rem',
                    borderRadius: '8px'
                }}>
                    {Array.from({ length: 24 }, (_, hour) => {
                        const hourData = timeSeriesData.find(d => parseInt(d.time.split(':')[0]) === hour);
                        const intensity = hourData ? Math.min(hourData.deployments / 10, 1) : 0;

                        return (
                            <div
                                key={hour}
                                style={{
                                    height: '40px',
                                    backgroundColor: `rgba(16, 185, 129, ${intensity})`,
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    color: intensity > 0.5 ? '#000' : '#fff'
                                }}
                                title={`${hour}:00 - ${hourData?.deployments || 0} deployments`}
                            >
                                {hour}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const renderNetworkView = () => (
        <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                <BarChart3 size={20} />
                Network Health & Metrics
            </h3>

            {/* Key Metrics Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div className="asi-card glass">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Clock size={16} style={{ color: '#10b981' }} />
                        <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Avg Block Time</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#10b981' }}>
                        {chartData.length > 0
                            ? (chartData.reduce((acc, block) => acc + block.timeSinceLastBlock, 0) / chartData.length).toFixed(1)
                            : '0.0'
                        }s
                    </div>
                </div>

                <div className="asi-card glass">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Database size={16} style={{ color: '#3b82f6' }} />
                        <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Total Blocks</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#3b82f6' }}>
                        {blocks.length}
                    </div>
                </div>

                <div className="asi-card glass">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Zap size={16} style={{ color: '#f59e0b' }} />
                        <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Total Deployments</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#f59e0b' }}>
                        {blocks.reduce((acc, block) => acc + (block.deployment_count || 0), 0)}
                    </div>
                </div>

                <div className="asi-card glass">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Users size={16} style={{ color: '#8b5cf6' }} />
                        <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Active Validators</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#8b5cf6' }}>
                        {proposerData.length}
                    </div>
                </div>
            </div>

            {/* Network Health Chart */}
            <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ marginBottom: '1rem' }}>Network Performance Overview</h4>
                <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis
                            dataKey="formattedTime"
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                        />
                        <YAxis
                            yAxisId="left"
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                        />
                        <Tooltip content={<BlockTimelineTooltip />} />
                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="blockSize"
                            fill="#10b98120"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Block Size"
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="timeSinceLastBlock"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={false}
                            name="Block Time"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    const viewOptions = [
        { key: 'timeline', label: 'Timeline', icon: Activity },
        { key: 'proposers', label: 'Validators', icon: Users },
        { key: 'activity', label: 'Activity', icon: Activity },
        { key: 'network', label: 'Network', icon: BarChart3 }
    ];

    return (
        <div className="asi-card">
            {/* Header with View Selector */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '1rem'
            }}>
                <div>
                    <h2 style={{ margin: '0 0 0.5rem 0' }}>Block Data Visualization</h2>
                    <p style={{ margin: 0, color: '#9ca3af' }}>
                        Interactive analysis of {blocks.length} recent blocks
                    </p>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '0.25rem'
                }}>
                    {viewOptions.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setSelectedView(key as any)}
                            style={{
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '6px',
                                backgroundColor: selectedView === key ? '#10b981' : 'transparent',
                                color: selectedView === key ? '#000' : '#9ca3af',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Icon size={16} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={selectedView}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    {selectedView === 'timeline' && renderTimelineView()}
                    {selectedView === 'proposers' && renderProposersView()}
                    {selectedView === 'activity' && renderActivityView()}
                    {selectedView === 'network' && renderNetworkView()}
                </motion.div>
            </AnimatePresence>

            {/* Selected Block Modal */}
            <AnimatePresence>
                {selectedBlock && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000
                        }}
                        onClick={() => setSelectedBlock(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="asi-card"
                            style={{
                                maxWidth: '500px',
                                width: '90%',
                                maxHeight: '80vh',
                                overflow: 'auto'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1rem'
                            }}>
                                <h3 style={{ margin: 0 }}>Block #{selectedBlock.block_number}</h3>
                                <button
                                    onClick={() => setSelectedBlock(null)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#9ca3af',
                                        cursor: 'pointer',
                                        fontSize: '1.5rem'
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            <div style={{ gap: '1rem' }}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <strong>Hash:</strong>
                                    <br />
                                    <code style={{ fontSize: '0.875rem', wordBreak: 'break-all' }}>
                                        {selectedBlock.block_hash}
                                    </code>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <strong>Proposer:</strong>
                                    <br />
                                    <code style={{ fontSize: '0.875rem', wordBreak: 'break-all' }}>
                                        {selectedBlock.proposer}
                                    </code>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <strong>Timestamp:</strong>
                                    <br />
                                    {format(new Date(selectedBlock.timestamp), 'PPpp')}
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <strong>Deployments:</strong> {selectedBlock.deployment_count || 0}
                                </div>

                                {selectedBlock.state_hash && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <strong>State Hash:</strong>
                                        <br />
                                        <code style={{ fontSize: '0.875rem', wordBreak: 'break-all' }}>
                                            {selectedBlock.state_hash}
                                        </code>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BlockVisualization;