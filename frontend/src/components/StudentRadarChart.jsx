import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const StudentRadarChart = ({ radarData, studentId }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  
  // Find data for selected student or default to first
  const studentData = studentId && radarData ? radarData.find(d => d.student_id === studentId) : (radarData && radarData[0]);

  useEffect(() => {
    if (!studentData || !studentData.skills || studentData.skills.length === 0) return;

    d3.select(svgRef.current).selectAll("*").remove();

    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const width = containerRef.current.clientWidth - margin.left - margin.right;
    const height = Math.min(width, 400); // Make it a square roughly
    const radius = Math.min(width, height) / 2;

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${width/2 + margin.left},${height/2 + margin.top})`);

    const features = studentData.skills.map(d => d.topic);
    const dataValues = studentData.skills.map(d => d.score); // between 0 and 1
    
    // Scale for radius
    const rScale = d3.scaleLinear().range([0, radius]).domain([0, 1]);
    const ticks = [0.2, 0.4, 0.6, 0.8, 1];

    // Draw grid circles
    svg.selectAll(".grid-circle")
      .data(ticks)
      .enter()
      .append("circle")
      .attr("class", "grid-circle")
      .attr("r", d => rScale(d))
      .style("fill", "none")
      .style("stroke", "rgba(255,255,255,0.1)")
      .style("stroke-dasharray", "3,3");
      
    // Draw grid labels
    svg.selectAll(".grid-label")
      .data(ticks)
      .enter()
      .append("text")
      .attr("x", 4)
      .attr("y", d => -rScale(d))
      .attr("dy", "0.4em")
      .style("font-size", "10px")
      .style("fill", "rgba(255,255,255,0.5)")
      .text(d => d * 100 + "%");

    // Draw axes
    const angleSlice = Math.PI * 2 / features.length;
    
    const axis = svg.selectAll(".axis")
      .data(features)
      .enter()
      .append("g")
      .attr("class", "axis");
      
    axis.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", (d, i) => rScale(1) * Math.cos(angleSlice * i - Math.PI/2))
      .attr("y2", (d, i) => rScale(1) * Math.sin(angleSlice * i - Math.PI/2))
      .style("stroke", "rgba(255,255,255,0.2)")
      .style("stroke-width", "1px");
      
    axis.append("text")
      .attr("x", (d, i) => rScale(1.15) * Math.cos(angleSlice * i - Math.PI/2))
      .attr("y", (d, i) => rScale(1.15) * Math.sin(angleSlice * i - Math.PI/2))
      .style("font-size", "12px")
      .style("fill", "#f8fafc")
      .style("text-anchor", "middle")
      .text(d => d);

    // Draw radar area
    const line = d3.lineRadial()
      .angle((d, i) => i * angleSlice)
      .radius(d => rScale(d))
      .curve(d3.curveLinearClosed);
      
    const pathData = dataValues.concat([dataValues[0]]); // close the path for the line function, though curveLinearClosed might do it

    const radarWrapper = svg.append("g").attr("class", "radarWrapper");
    
    // Animate radar fill
    radarWrapper.append("path")
      .attr("class", "radarArea")
      .attr("d", line(dataValues))
      .style("fill", "#8b5cf6")
      .style("fill-opacity", 0)
      .style("stroke", "none")
      .transition()
      .duration(1000)
      .style("fill-opacity", 0.3);
      
    // Draw radar stroke
    radarWrapper.append("path")
      .attr("class", "radarStroke")
      .attr("d", line(dataValues))
      .style("stroke", "#c084fc")
      .style("stroke-width", "2px")
      .style("fill", "none");
      
    // Draw circles at data points
    radarWrapper.selectAll(".radarCircle")
      .data(dataValues)
      .enter()
      .append("circle")
      .attr("class", "radarCircle")
      .attr("r", 4)
      .attr("cx", (d, i) => rScale(d) * Math.cos(angleSlice * i - Math.PI/2))
      .attr("cy", (d, i) => rScale(d) * Math.sin(angleSlice * i - Math.PI/2))
      .style("fill", "#c084fc")
      .style("fill-opacity", 0.8)
      .style("stroke", "#fff")
      .style("stroke-width", "1px");

  }, [studentData]);

  if (!studentData) return <div style={{ color: 'var(--text-secondary)' }}>Select a student to view their skill profile.</div>;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        Skill Profile for <strong>{studentData.student_id}</strong> (Cluster {studentData.cluster})
      </div>
      <div ref={containerRef} style={{ width: '100%', maxWidth: '400px' }}>
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
};

export default StudentRadarChart;
