import { useCallback, useEffect, useRef, useState } from "react"
import jsonData from "./LastTreeData.json"
import {zoom} from "d3-zoom"
import * as d3 from "d3"

const LastTree = () => {

    const svgRef = useRef()

    const getTotalArray = (array) => {
      // Calculate the total bandwidth
          return array.reduce((total, item) => {
              return total + item;
          }, 0);
    }
      

    const getDataBasedOnCategory = (category, data) => {
      return data.find((item) => item.category === category)?.children || [];
    }

    const categoryNames = jsonData.map((item) => item.category);

    //set data based on category
    const [data, setSata] = useState(() => getDataBasedOnCategory("contact", jsonData))

    //the data that tree will show it
    const [timeRanges, setTimeRanges] = useState(() => {
      const timeRangesWithBandWidths = []



      data.forEach((data) => {
        const direction = []
        data.application.forEach(app => {
          direction.push({
            "direction": app.direction[0].direction,
            "total_bandwidth": app.direction[0].total_bandwidth,
            "total_session_count": app.direction[0].total_session_count
          })
        })


        timeRangesWithBandWidths.push({
          "time_range": data.time_range,
          "children": direction
        });
      })

      return timeRangesWithBandWidths
    })

    const [bandwidths, setTotalBandWidths] = useState(() => {
      const totalBandwidths = []
      timeRanges.forEach(time => {
        time.children.forEach(dir => {
          totalBandwidths.push(dir.total_bandwidth)
        })
      })

      return totalBandwidths
    })

    //Unique applicatins name in array
    const [applications, setApplications] = useState(() => {
      const uniqueAppNames = new Set();

      data.forEach((timeRange) => {
          timeRange.application.forEach((app) => {
              uniqueAppNames.add(app.application_name);
          });
      });

      const array_of_applications = Array.from(uniqueAppNames)

      // const applications = []
      // array_of_applications.forEach(app => {
      //   applications.push({
      //     "application_name": app.application_name
      //   })
      // })

      return array_of_applications;
    })

    //take bandwidth as percentage of total bandwidth
    const calculateBandwidthPercent = useCallback((bandwidth) => {
        
      const totalBandwidth = getTotalArray(bandwidths)
      const percentage = (bandwidth / totalBandwidth) * 100;

      return percentage
  }, [bandwidths])


  //make application parents
  const getProccessedData = useCallback(() => {
    var groupedData = [];
  
    data.forEach(function (item) {
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
  }, [data]);

    //for svg zoom
    const [zoomed, setZoomed] = useState(false)

    const width = 1000
    const height = 100

    useEffect(() => {
      // console.log(data)
      console.log(timeRanges)
      // console.log(applications)
      // console.log(getProccessedData())




      const svg = d3.select(svgRef.current)
      const colorScale = d3.scaleLinear()
        .domain([0, 10]) 
        .range(["red", "#27F761"]); 

        //build original tree layout
        const root = d3.hierarchy({children: timeRanges}, d => d.children)
        const originalTreeLayout = d3.tree().nodeSize([height, width])
        originalTreeLayout(root)


        //build second tree layout
        const root2 = d3.hierarchy({children: getProccessedData()}, d => d.children)
        const secondTreeLayout = d3.tree().nodeSize([height, width])
        secondTreeLayout(root2)



        // Second tree Nodes 
        console.log(root2.descendants().slice(1))
        svg.selectAll(".secondNode")
            .data(root2.descendants().slice(1))
            .join(
                enter => enter.append("rect"),
                update => update.attr("class", "secondNode"),
                exit => exit.remove()
            )
            .attr("class", "secondNode")
            .attr("stroke", "#4C8EE4") // Set border color to black (#000)
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

                    // if(Array.isArray(node.data.application_name)) {
                    //     return 0
                    // }
                    return calculateBandwidthPercent(node.data.children[0].children[0].total_bandwidth) * 2
                }

                
                return 0

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

                return "black"
            })
            .attr("x", node => -node.y + 3005)
            .attr("y", node => {
                if (node.data.application_name) {
                    if (node.data.children.length > 1) {
                        // Set y-coordinate to the y-coordinate of the first descendant
                        const firstDescendant = node.descendants()[1];
                        const y = firstDescendant.x - (calculateBandwidthPercent(firstDescendant.data.children[0].total_bandwidth) * 2) / 4;
                        return y // To vertically center the node
                        
                    }
                    return node.x - (calculateBandwidthPercent(node.data.children[0].children[0].total_bandwidth) * 2) / 2
                }

                return 0
            })
            .attr("transform", d => `translate(${d.y + 50}, ${d.x})`);





            //original tree nodes
        console.log(applications)
        svg.selectAll(".node")
        .data(root.descendants().slice(1, applications.length))
        .join(
            enter => enter.append("rect"),
            update => update.attr("class", "node"),
            exit => exit.remove()
        )
        .attr("class", "node")
        .attr("stroke", "#4C8EE4") // Set border color to black (#000)
        .attr("stroke-width", 1) // Set border width to 1px
        .attr("width", 40)
        .attr("height", node => {
          if (node.data.children.length > 1) {
              // const sum = []
              // node.data.children.forEach(child => {
              //   sum.push(calculateBandwidthPercent(child.total_bandwidth))
              // })

              const sources = []
              root.links().slice(timeRanges.length).forEach(link => {
                if (link.source.data.time_range === node.data.time_range) {
                  sources.push(link)
                }

              })

              const firstSource = sources[0]
              const lastSource = sources[sources.length - 1]
              const height = lastSource.target.x - firstSource.target.x

              return height
          }
          return calculateBandwidthPercent(node.data.children[0].total_bandwidth) * 2
        })
        .attr("fill", node => {
          if (node.data.children.length > 1) {
            const bandWidths = []
            node.data.children.forEach(dir => {
              bandWidths.push(dir.total_bandwidth)
            })

            const sum = getTotalArray(bandWidths)
            return colorScale(sum)
          }
          return colorScale(calculateBandwidthPercent(node.data.children[0].total_bandwidth))
        })
        .attr("x", node => node.y + 5)
        .attr("y", node => {
          if (node.data.children.length > 1) {
            const sources = []
              root.links().slice(timeRanges.length).forEach(link => {
                if (link.source.data.time_range === node.data.time_range) {
                  sources.push(link)
                }

              })

            const firstSource = sources[0]
            return firstSource.source.x - firstSource.target.x
          }
            return node.x - (calculateBandwidthPercent(node.data.children[0].total_bandwidth) * 2) / 2
        })
        .attr("transform", d => `translate(${d.y + 50}, ${d.x})`);

        //Link Generator
        const linkGenerator = (link) => {
          // Create straight vertical links
          const sourceY = link.source.y + 50 
          const targetY = link.target.y;
      
          return `
              M${sourceY},${link.source.x - (link.source.x - link.target.x)}
              V${link.target.x}
              H${targetY}
          `;
        };

        //LINKS
        // console.log(root.links().slice(timeRanges.length))
        const links = svg.selectAll(".link")
        .data(root.links().slice(timeRanges.length))
        .join(
            enter => enter.append("path"),
            update => update.attr("class", "node"),
            (exit) => exit.remove()
        )
        .attr("class", "link")
        .attr("fill", "none")
        .attr("stroke", link => {
          return colorScale(calculateBandwidthPercent(link.target.data.total_bandwidth)) 
        })
        .attr("d", linkGenerator)
        .attr("transform", "translate(50, 50)")
        .attr("stroke-dasharray", function() {
            const length = this.getTotalLength();
            return `${length} ${length}`;
        })
        .attr("stroke-dashoffset", function() {
            const length = this.getTotalLength();
            return length;
        })      .attr("marker-end", "url(#arrow)")
        .attr("stroke-width", link => calculateBandwidthPercent(link.target.data.total_bandwidth) * 2)
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

            if (node.data.total_bandwidth || node.data.total_bandwidth === 0) {
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

            if (node.data.total_bandwidth|| node.data.total_bandwidth === 0) {
                return node.y - 25
            }
            return node.y + 50
        })
        .attr("y", node => node.x + 5).attr("transform", "translate(50, 50)")
        .attr("opacity", 0)
        .transition()
        .duration(500)
        .delay(linkObj => linkObj.depth * 500)
        .attr("opacity", 1)




        //Texts
        svg.selectAll(".label2")
        .data(root2.descendants().slice(1))
        .join(
          enter => enter.append("text"),
          update => update.attr("opcaity", 1),
          (exit) => exit.attr("opacity", 0).remove()
        )
        .attr("class", "label2")
        .text(node => {
            if (node.data.application_name) {
                
                return node.data.application_name
            }


            return ""

            
        })
        .attr("text-anchor", d => (d.children ? "start" : "end"))
        .attr("font-size", 26)
        .attr("font-weight", "bold")
        .style("letter-spacing", "2px")
        .attr("fill", "#fff")
        .attr("x", node => {

            return node.y + 1080
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
          svg.selectAll(".node, .link, .label, .secondNode, .label2").attr("transform", transform);
        })

        svg.call(zoomBehavior);
        svg.transition().call(zoomBehavior.scaleBy, 0.9999999)

        if(!zoomed) {
            
            svg.call(zoomBehavior.translateBy, -900, 550);
            svg.call(zoomBehavior.scaleBy, 0.7)
            setZoomed(true)
        }
    }, [timeRanges, data, applications, zoomed])
    
  return (
    <div className="tree-div">
                <ul className="categories">
                    <li className="category">Categories:</li>
                    {categoryNames.map(category => {
                        return (
                            <li className="category" key={category}>{category}</li>
                        )
                    })}
                </ul>
                <svg ref={svgRef} className="tree-svg">
                </svg>
                <br />
        </div>
  )
}

export default LastTree