import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const CohortHeatmap = ({ data, selectedTopic, selectedGrade }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Filter data based on selections
    let filteredData = data;
    if (selectedTopic !== 'All Topics') {
      filteredData = filteredData.filter(d => d.topic === selectedTopic);
    }
    if (selectedGrade !== 'All Grades') {
      filteredData = filteredData.filter(d => d.grade === selectedGrade);
    }

    // Sort students by cluster, then by ability
    const students = Array.from(new Set(filteredData.map(d => d.student_id)));
    const studentMap = new Map();
    filteredData.forEach(d => {
      if (!studentMap.has(d.student_id)) {
        studentMap.set(d.student_id, { cluster: d.cluster, ability: d.ability });
      }
    });
    
    students.sort((a, b) => {
      const sa = studentMap.get(a);
      const sb = studentMap.get(b);
      if (sa.cluster !== sb.cluster) return sa.cluster - sb.cluster;
      return sb.ability - sa.ability;
    });

    const questions = Array.from(new Set(filteredData.map(d => d.question_id))).sort();

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    // Setup dimensions
    const margin = { top: 40, right: 20, bottom: 60, left: 60 };
    const width = containerRef.current.clientWidth - margin.left - margin.right;
    const height = Math.max(500, students.length * 12) - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleBand()
      .range([0, width])
      .domain(questions)
      .padding(0.05);

    const y = d3.scaleBand()
      .range([height, 0])
      .domain(students)
      .padding(0.05);

    // Color scale mapping responses
    // 1: correct (green), 0: incorrect (red), null: skipped (gray)
    const colorScale = (val) => {
      if (val === 1) return '#10b981'; // success
      if (val === 0) return '#ef4444'; // danger
      return '#334155'; // skipped/missing
    };

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "d3-tooltip");

    // Add rectangles
    svg.selectAll()
      .data(filteredData)
      .enter()
      .append("rect")
      .attr("x", d => x(d.question_id))
      .attr("y", d => y(d.student_id))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", d => colorScale(d.response))
      .style("opacity", 0) // Start transparent for animation
      .attr("rx", 2)
      .attr("ry", 2)
      .on("mouseover", function(event, d) {
        d3.select(this).style("stroke", "#fff").style("stroke-width", 2);
        tooltip.style("opacity", 1)
          .html(`
            <strong>Student:</strong> ${d.student_id}<br/>
            <strong>Question:</strong> ${d.question_id} (${d.topic})<br/>
            <strong>Response:</strong> ${d.response === 1 ? 'Correct' : d.response === 0 ? 'Incorrect' : 'Skipped'}
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function(event, d) {
        d3.select(this).style("stroke", "none");
        tooltip.style("opacity", 0);
      })
      .transition()
      .duration(800)
      .delay((d, i) => i * 0.5) // Staggered animation
      .style("opacity", 1);

    // Add axes
    const xAxis = svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickSize(0))
      .select(".domain").remove();
      
    svg.selectAll(".tick text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .style("fill", "#94a3b8");

    svg.append("g")
      .call(d3.axisLeft(y).tickSize(0).tickValues(y.domain().filter((d,i) => i % Math.ceil(students.length/20) === 0)))
      .select(".domain").remove();
      
    svg.selectAll(".tick text")
      .style("fill", "#94a3b8");

    // Cleanup tooltip on unmount
    return () => {
      d3.selectAll(".d3-tooltip").remove();
    };

  }, [data, selectedTopic, selectedGrade]);

  return (
    <div ref={containerRef} style={{ width: '100%', overflowX: 'auto' }}>
      <svg ref={svgRef}></svg>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center', fontSize: '0.875rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 12, height: 12, background: '#10b981', borderRadius: 2 }}></div> Correct
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 12, height: 12, background: '#ef4444', borderRadius: 2 }}></div> Incorrect
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 12, height: 12, background: '#334155', borderRadius: 2 }}></div> Skipped
        </span>
      </div>
    </div>
  );
};

export default CohortHeatmap;
