import { useCallback, useEffect, useRef, useState } from "react"
import jsonData from "./CustomTreeData.json"
import {zoom} from "d3-zoom"
import * as d3 from "d3"
import "./Tree.css"

const CustomTree = () => {
  const svgRef = useRef()

//   const getDataBasedOnCategory = (category, data) => {
//     return data.find((item) => item.category === category)?.children || [];
//   }

  const getTotalArray = (array) => {
// Calculate the total bandwidth
    return array.reduce((total, item) => {
        return total + item;
    }, 0);
  }


    const [zoomed, setZoomed] = useState(false)

    // const categoryNames = jsonData.map((item) => item.category);

    const getProccessedData = useCallback(() => {
        var groupedData = [];
      
        jsonData.forEach(function (item) {
            var timeRange = item.time_range;

            item.application.forEach(function (app) {
                var applicationName = app.application_name;
                var direction = app.direction;
                
                // Check if the application already exists in groupedData
                var existingApp = groupedData.find(
                    (groupedApp) => groupedApp.application_name === applicationName
                );


                // Create a new object for the time_range with direction information
                var timeRangeObj = {
                    time_range: timeRange,
                    children: direction,
                };
        
                // If the application already exists, add the time_range to its array
                if (existingApp) {
                    existingApp.children.push(timeRangeObj);
                } else {
                // Otherwise, create a new entry for the application
                    groupedData.push({
                        application_name: applicationName,
                        children: [timeRangeObj],
                    });
                }

          });
      
          // Sort the children array based on time_range before moving to the next item
          groupedData.sort((a, b) => {
            const timeA = a.children[0].time_range;
            const timeB = b.children[0].time_range;
            return timeA.localeCompare(timeB);
          });
        });
      
        return groupedData;
      }, []);



    const [range_time_unique_application] = useState(() => getProccessedData())



    //store all data_bandwdiths in array
    const [totalBandwidths] = useState(() => {
        var totalBandwidthArray = [];
        range_time_unique_application.forEach(function (app) {

            app.children.forEach(function (timeRange) {
            
            timeRange.children.forEach(function (direction) {
                totalBandwidthArray.push(direction.total_bandwidth);
            });
            });
        });


        return totalBandwidthArray
    })

    //Return all bandwidths to each application

    // const [appBandWidths] = useState(() => {
    //     var totalBandwidthArray = [];
    //     range_time_unique_application.forEach(function (app) {
    //         var bandwidths = []
    //         app.children.forEach(function (timeRange) {
            
    //         timeRange.children.forEach(function (direction) {
    //             bandwidths.push(direction.total_bandwidth);
    //         });
    //         });
    //         // app.total_bandwidth_array = totalBandwidthArray;
    //         totalBandwidthArray.push({
    //             "applications": app.application_name,
    //             "bandwidths": bandwidths
    //         })
    //     });

    //     // totalBandwidthArray.unshift(getTotalArray(totalBandwidthArray))
    //     return totalBandwidthArray
    // })


    const width = 1000
    const height = 100


    //take bandwidth as percentage of total bandwidth
    const calculateBandwidthPercent = useCallback((bandwidth) => {
        
        const totalBandwidth = getTotalArray(totalBandwidths)
        const percentage = (bandwidth / totalBandwidth) * 100;

        return percentage
    }, [totalBandwidths])


    const isTimeRangeRepeated = useCallback((data, timeRange) => {
        const timeRanges = data.flatMap(item => item.children.map(child => child.time_range));
        const count = timeRanges.filter(range => range === timeRange).length;
        return count;
      }, [])




    useEffect(() => {
        

        const svg = d3.select(svgRef.current)
        const colorScale = d3.scaleLinear()
        .domain([0, 10]) 
        .range(["red", "#27F761"]); 

        //build tree layout
        const root = d3.hierarchy({children: range_time_unique_application}, d => d.children)
        const treeLayout = d3.tree().nodeSize([height, width])
        treeLayout(root)


        //console
        // console.log(range_time_unique_application)
        // console.log(totalBandwidths)
        // console.log(root.descendants().slice(1, root.descendants().length - totalBandwidths.length ))
        // console.log(root.links().slice(range_time_unique_application.length, root.links().length - totalBandwidths.length))

        //Link Generator
        const linkGenerator = (link) => {
            // Create straight vertical links
            const sourceY = -link.source.y 
            const targetY = -link.target.y + 50;
        
            return `
                M${sourceY},${link.source.x - (link.source.x - link.target.x)}
                V${link.target.x}
                H${targetY}
            `;
        };


        //Show Nodes As Blocks
        svg.selectAll(".node")
            .data(root.descendants().slice(1, root.descendants().length - totalBandwidths.length))
            .join(
                enter => enter.append("rect"),
                update => update.attr("class", "node"),
                exit => exit.remove()
            )
            .attr("class", "node")
            .attr("stroke", "#4C8EE4") // Set border color 
            .attr("stroke-width", 1) // Set border width to 1px
            .attr("width", 40)
            .attr("height", (node) => {

                if (node.data.application_name) {
                    if (node.data.children.length > 1) {
                    // Calculate the distance between the top of the first node and the bottom of the last node
                    const firstDescendant = node.descendants()[1];
                    const lastDescendant = node.descendants()[node.descendants().length - 1];
                    const height = lastDescendant.x - firstDescendant.x;
                    return height + (calculateBandwidthPercent(firstDescendant.data.children[0].total_bandwidth) * 2) / 2 + 10;
                        
                    }


                    return calculateBandwidthPercent(node.data.children[0].children[0].total_bandwidth) * 2
                }

                return calculateBandwidthPercent(node.data.children[0].total_bandwidth) * 2
            })
            .attr("fill", node => {
                if (node.data.application_name) {
                    if (node.data.children.length > 1) {
                        // Calculate an intermediate color between the children's colors
                        const totalBandwidthSum = node.data.children.reduce((sum, child) => sum + child.children[0].total_bandwidth, 0);
                        const averageBandwidth = totalBandwidthSum / node.data.children.length;
                        const averagePercentage = calculateBandwidthPercent(averageBandwidth);
                        return colorScale(averagePercentage);
                        
                    }
                    return colorScale(calculateBandwidthPercent(node.data.children[0].children[0].total_bandwidth))
                }
                return colorScale(calculateBandwidthPercent(node.data.children[0].total_bandwidth))
            })
            .attr("x", node => -node.y + 5)
            .attr("y", node => {
                if (node.data.application_name) {
                    if (node.data.children.length > 1) {
                        // Set y-coordinate to the y-coordinate of the first descendant
                        const firstDescendant = node.descendants()[1];
                        const y = firstDescendant.x - (calculateBandwidthPercent(firstDescendant.data.children[0].total_bandwidth) * 2) / 2;
                        return y // To vertically center the node
                        
                    }
                    return node.x - (calculateBandwidthPercent(node.data.children[0].children[0].total_bandwidth) * 2) / 2
                }
                return node.x - (calculateBandwidthPercent(node.data.children[0].total_bandwidth) * 2) / 2
            })
            .attr("transform", d => `translate(${d.y + 50}, ${d.x})`);

            
            //Show LINKS
            const links = svg.selectAll(".link")
            .data(root.links().slice(range_time_unique_application.length, root.links().length - totalBandwidths.length))
            .join(
                enter => enter.append("path"),
                update => update.attr("class", "node"),
                (exit) => exit.remove()
            )
            .attr("class", "link")
            .attr("fill", "none")
            .attr("stroke", node => {
                if (node.target.data.application_name) {
                    if (node.target.data.children.length > 1) {
                        // Calculate an intermediate color between the children's colors
                        const totalBandwidthSum = node.target.data.children.reduce((sum, child) => sum + child.children[0].total_bandwidth, 0);
                        const averageBandwidth = totalBandwidthSum / node.target.data.children.length;
                        const averagePercentage = calculateBandwidthPercent(averageBandwidth);
                        return colorScale(averagePercentage);
                        
                    }
                    return colorScale(calculateBandwidthPercent(node.target.data.children[0].children[0].total_bandwidth))
                }
                return colorScale(calculateBandwidthPercent(node.target.data.children[0].total_bandwidth))
            })
            .attr("d", linkGenerator)
            .attr("transform", "translate(50, 50)")
            .attr("stroke-dasharray", function() {
                const length = this.getTotalLength();
                return `${length} ${length}`;
            })
            .attr("stroke-dashoffset", function() {
                const length = this.getTotalLength();
                return -length;
            }).attr("marker-end", "url(#arrow)")
            .attr("stroke-width", node => {
                if (node.target.data.application_name) {
                    if (node.target.data.children.length > 1) {
                        // Calculate height based on the difference between y-coordinates of first and last descendants
                        const firstDescendant = node.target.descendants()[1];
                        const lastDescendant = node.target.descendants()[node.target.descendants().length - 1];
                        const height = lastDescendant.x - firstDescendant.x;
                        return height + 80;
                        
                    }
                    return calculateBandwidthPercent(node.target.data.children[0].children[0].total_bandwidth) * 2
                }
                return calculateBandwidthPercent(node.target.data.children[0].total_bandwidth) * 2
            })
            .attr("opacity", 0.5)

            links.transition()
            .duration(500)
            .delay(linkObj => linkObj.source.depth * 500)
            .attr("stroke-dashoffset", 0);



            //Texts
            svg.selectAll(".label")
            .data(root.descendants().slice(1))
            .join(
              enter => enter.append("text"),
              update => update.attr("opcaity", 1),
              (exit) => exit.attr("opacity", 0).remove()
            )
            .attr("class", "label")
            .text(node => {
                if (node.data.application_name) {
                    
                    return node.data.application_name
                }

                if (node.data.time_range) {
                    return node.data.time_range
                }

                if (node.data.total_bandwidth > 0) {
                    return "Band Width: " + node.data.total_bandwidth
                }

                if (node.data.total_bandwidth === 0) {
                    return "Band Width: " + node.data.total_bandwidth
                }
                return ""

                
            })
            .attr("text-anchor", d => (d.children ? "start" : "end"))
            .attr("font-size", 26)
            .attr("font-weight", "bold")
            .style("letter-spacing", "2px")
            .attr("fill", "#fff")
            .attr("x", node => {

                if (node.data.total_bandwidth ||node.data.total_bandwidth === 0) {
                    return -node.y + 1990
                }


                return -node.y + 50
            })
            .attr("y", node => node.x + 5).attr("transform", "translate(50, 50)")
            .attr("opacity", 0)
            .transition()
            .duration(500)
            .delay(linkObj => linkObj.depth * 500)
            .attr("opacity", 1)



            // Implement panning and zooming
            const zoomBehavior = zoom().on("zoom", (event) => {
                const { transform } = event;
                svg.selectAll(".node, .link, .label").attr("transform", transform);
            })
            svg.call(zoomBehavior);
            svg.transition().call(zoomBehavior.scaleBy, 0.9999999)
            if(!zoomed) {
                
                svg.call(zoomBehavior.translateBy, 2000, 600);
                svg.call(zoomBehavior.scaleBy, 0.7)
                setZoomed(true)
            }

        

        // Set the default panning and scaling

    },[calculateBandwidthPercent, isTimeRangeRepeated, range_time_unique_application, totalBandwidths, zoomed])





    return (
        <div className="tree-div">
                {/* <ul className="categories">
                    <li className="category">Categories:</li>
                    {categoryNames.map(category => {
                        return (
                            <li className="category" key={category} onClick={e => {
                                set_time_unique_application(() => getProccessedData(e.target.textContent))
                            }}>{category}</li>
                        )
                    })}
                </ul> */}
                <svg ref={svgRef} className="tree-svg">
                </svg>
                <br />
        </div>
    )
}

export default CustomTree