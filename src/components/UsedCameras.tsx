import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useFiles } from '../contexts/FileContext';
import { toPng } from 'html-to-image';

export const UsedCameras: React.FC = () => {
  const { setFiles: setSelectedFiles } = useFiles(); // Added for returnToHome
  const cameraChartRef = useRef<HTMLDivElement>(null);
  const photoChartRef = useRef<HTMLDivElement>(null);
  const [customTitle, setCustomTitle] = useState<string>('');

  const returnToHome = React.useCallback(() => {
    setSelectedFiles([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setSelectedFiles]);
  


  const [useMultipleColors, setUseMultipleColors] = React.useState(true); // State for color mode
  const { t, i18n } = useTranslation();
  const { cameraUsageData, setCameraUsageData, isLoadingExif } = useFiles();

  const MIN_DURATION_MS = 1 * 24 * 60 * 60 * 1000; // 1 day for minimum visual width

  // Define data processing logic before any conditional returns
  // Ensure cameraUsageData is always an array (e.g., initialized as [] in useFiles context)
  const visibleCameras = React.useMemo(() => {
    return cameraUsageData
      .filter(camera => !camera.isExcluded)
      .sort((a, b) => {
        const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
        const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
        return dateA - dateB; // Sort by endDate ascending
      });
  }, [cameraUsageData]);

  const excludedCameras = cameraUsageData.filter(camera => camera.isExcluded);

  // Helper function to format camera name, avoiding duplication for NIKON
  const formatCameraName = React.useCallback((make: string | undefined, model: string) => {
    const makeStr = make || '';
    const modelStr = model || '';
    
    // If make contains "NIKON" and model also starts with "NIKON", show only model
    if (makeStr.toUpperCase().includes('NIKON') && modelStr.toUpperCase().startsWith('NIKON')) {
      return modelStr.trim();
    }
    
    // Otherwise, show both make and model as before
    return `${makeStr} ${modelStr}`.trim();
  }, []);

  const captureChart = React.useCallback(async () => {
    if (!cameraChartRef.current) {
      alert('차트를 찾을 수 없습니다.');
      return;
    }

    try {
      const originalChart = cameraChartRef.current;
      const dynamicHeight = Math.max(320, visibleCameras.length * 16 + 80);
      await captureChartHelper(originalChart, dynamicHeight, customTitle ? `${customTitle}'s Camera History` : 'My Camera History', 'my-camera-history.png');
    } catch (error: unknown) {
      console.error('Error capturing chart:', error);
      alert('차트 캡처 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  }, [cameraChartRef, customTitle, visibleCameras]);

  const capturePhotoChart = React.useCallback(async () => {
    if (!photoChartRef.current) {
      alert('차트를 찾을 수 없습니다.');
      return;
    }

    try {
      const originalChart = photoChartRef.current;
      const dynamicHeight = 265; // Fixed height for photo chart
      const photoTitle = customTitle ? `${customTitle}'s Photos by Year` : t('usedCameras.photosByYearTitle', 'Photos per Year');
       await captureChartHelper(originalChart, dynamicHeight, photoTitle, 'photos-per-year.png');
    } catch (error: unknown) {
      console.error('Error capturing photo chart:', error);
      alert('차트 캡처 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  }, [photoChartRef, customTitle, t]);

  const captureChartHelper = React.useCallback(async (originalChart: HTMLElement, dynamicHeight: number, title: string, filename: string) => {
      
      // 캡처를 위한 임시 컨테이너 생성 (실제 DOM에 추가)
      const parentContainer = document.createElement('div');
      Object.assign(parentContainer.style, {
        position: 'absolute',
        zIndex: '-999',
        left: '0',
        top: '0',
        opacity: '0',
        transform: 'scale(1)',
        transformOrigin: 'top left',
      });
      
      const container = document.createElement('div');
      Object.assign(container.style, {
        width: '576px',
        height: `${dynamicHeight}px`,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      });
      
      // 배경 블러 효과 생성 (BackgroundBlur 컴포넌트와 유사하게)
      const blurContainer = document.createElement('div');
      Object.assign(blurContainer.style, {
        position: 'absolute',
        inset: '0',
        overflow: 'hidden',
      });
      
      // CARD_BUBBLES와 유사한 설정으로 버블 생성
      const bubbles = [
        { size: 800, color: 'rgba(66, 153, 225, 0.3)', blur: '80px', left: '10%', top: '20%' },
        { size: 400, color: 'rgba(102, 126, 234, 0.35)', blur: '70px', left: '50%', top: '10%' },
        { size: 350, color: 'rgba(244, 63, 94, 0.3)', blur: '60px', left: '80%', top: '30%' },
        { size: 300, color: 'rgba(217, 70, 239, 0.3)', blur: '50px', left: '20%', top: '70%' },
        { size: 250, color: 'rgba(6, 182, 212, 0.25)', blur: '40px', left: '70%', top: '60%' },
      ];
      
      bubbles.forEach((bubble) => {
        const bubbleElement = document.createElement('div');
        Object.assign(bubbleElement.style, {
          position: 'absolute',
          width: `${bubble.size}px`,
          height: `${bubble.size}px`,
          borderRadius: '50%',
          backgroundColor: bubble.color,
          filter: `blur(${bubble.blur})`,
          left: bubble.left,
          top: bubble.top,
        });
        blurContainer.appendChild(bubbleElement);
      });
      
      // 차트 패널 생성
      const chartPanel = document.createElement('div');
      Object.assign(chartPanel.style, {
        position: 'relative',
        width: '100%',
        height: '100%',
        paddingTop: '4px',
        paddingBottom: '8px',
        paddingLeft: '16px',
        paddingRight: '16px',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(8px)',
        borderRadius: '8px',
        zIndex: '1',
      });
      
      // WebKit 브라우저를 위한 접두사 추가
      (chartPanel.style as any)['-webkit-backdrop-filter'] = 'blur(8px)';
      
      // 제목 추가
      const titleElement = document.createElement('div');
      Object.assign(titleElement.style, {
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2px',
        paddingLeft: '8px',
        paddingRight: '8px',
      });
      
      const titleText = document.createElement('h2');
      titleText.textContent = title;
      Object.assign(titleText.style, {
        fontSize: '20px',
        fontWeight: '600',
        color: '#1f2937',
      });
      
      titleElement.appendChild(titleText);
      chartPanel.appendChild(titleElement);
      
      // 차트 복제 및 추가
      const chartContent = document.createElement('div');
      Object.assign(chartContent.style, {
        width: '100%',
        height: 'calc(100% - 16px)',
        position: 'relative',
      });
      
      // 원본 차트의 내용 복제
      const clonedChart = originalChart.querySelector('.recharts-wrapper')?.cloneNode(true) as HTMLElement;
      if (clonedChart) {
        // SVG 요소 처리 개선
        const svgElements = clonedChart.querySelectorAll('svg');
        svgElements.forEach((svg) => {
          // 컨테이너에 맞는 SVG 크기 설정 (여백 최소화)
          const chartWidth = 576 - 32; // 컨테이너 너비 - 패딩
          const chartHeight = dynamicHeight - 28; // 컨테이너 높이 - 제목 및 패딩 (여백 최소화)
          
          // SVG 크기 명시적 설정
          svg.setAttribute('width', `${chartWidth}`);
          svg.setAttribute('height', `${chartHeight}`);
          svg.style.width = `${chartWidth}px`;
          svg.style.height = `${chartHeight}px`;
          svg.style.overflow = 'visible';
          
          // SVG 내부 요소들이 보이도록 설정
          const paths = svg.querySelectorAll('path');
          paths.forEach(path => {
            path.setAttribute('stroke-width', path.getAttribute('stroke-width') || '2');
            path.setAttribute('stroke-opacity', '1');
            path.setAttribute('fill-opacity', path.getAttribute('fill-opacity') || '1');
          });
          
          // 텍스트 요소 처리
          const texts = svg.querySelectorAll('text');
          texts.forEach(text => {
            text.style.fontFamily = 'Arial, sans-serif';
            text.style.fontSize = '12px';
            text.style.color = '#000000';
          });
        });
        
        chartContent.appendChild(clonedChart);
      } else {
        // 차트 요소를 찾을 수 없는 경우 전체 내용 복제
        chartContent.innerHTML = originalChart.innerHTML;
      }
      
      chartPanel.appendChild(chartContent);
      
      // 요소들을 컨테이너에 추가
      container.appendChild(blurContainer);
      container.appendChild(chartPanel);
      parentContainer.appendChild(container);
      document.body.appendChild(parentContainer);
      
      // 렌더링 완료를 위한 지연
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 캡처 옵션 설정
      const options = {
        backgroundColor: '#ffffff', // 흰색 배경으로 설정
        pixelRatio: 2, // 고해상도 이미지를 위한 설정
        quality: 1.0,
        cacheBust: true, // 캐시 방지
        skipFonts: false,
        width: 576,
        height: dynamicHeight,
        style: {
          margin: '0',
          padding: '0',
          overflow: 'hidden'
        }
      };
      
      // 직접 PNG로 변환
      const dataUrl = await toPng(container, options);
      
      // 다운로드 링크 생성
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
      
      // 임시 요소 제거
      document.body.removeChild(parentContainer);
  }, []);

  // Define a color palette
const cameraColors = [
  '#82C8D1', '#9EC7A0', '#A9A9A9', '#F08080', // LightCoral
  '#8EC1EB', '#B4CD9E', '#99BD7B', '#FFD700', // Gold
  '#84C8E6', '#B4C04C', '#778899', '#FFA07A', // LightSalmon
  '#7EB381', '#88979E', '#20B2AA', '#5AA59D', // LightSeaGreen
  '#C2CD76', '#66CDAA', '#64ABE6', '#56B5E4'  // MediumAquaMarine
];
const defaultBarColor = '#8884d8'; // Default single color (light indigo/purple)

const chartData = React.useMemo(() => {
    return visibleCameras.map(cam => {
      const name = formatCameraName(cam.make, cam.model);
      const originalStartDate = cam.startDate;
      const originalEndDate = cam.endDate;

      let sTime = originalStartDate ? new Date(originalStartDate).getTime() : null;
      let eTime = originalEndDate ? new Date(originalEndDate).getTime() : null;

      if (sTime !== null && eTime !== null) { // Both dates present
        if (eTime < sTime) eTime = sTime; // Ensure end is not before start
        if (eTime - sTime < MIN_DURATION_MS) {
          eTime = sTime + MIN_DURATION_MS;
        }
      } else if (sTime !== null && eTime === null) { // Start present, end is not (ongoing)
        eTime = new Date().getTime(); // Default to now
        if (eTime - sTime < MIN_DURATION_MS) {
          eTime = sTime + MIN_DURATION_MS;
        }
      } else if (sTime === null && eTime !== null) { // End present, start is not
        sTime = eTime - MIN_DURATION_MS; // Default to MIN_DURATION_MS before end
      } else { // Neither date is present
        sTime = null;
        eTime = null;
      }

      return {
        name,
        range: [sTime, eTime],
        originalStartDate,
        originalEndDate,
        fill: useMultipleColors ? cameraColors[visibleCameras.findIndex(c => formatCameraName(c.make, c.model) === name) % cameraColors.length] : defaultBarColor,
      };
    }).filter(item => item.range[0] !== null && item.range[1] !== null);
  }, [visibleCameras, MIN_DURATION_MS, useMultipleColors, formatCameraName]);

  const photosByYearForVisibleCameras = React.useMemo(() => {
    const yearlyCounts: Record<number, number> = {};
    visibleCameras.forEach(camera => {
      if (camera.photosByYear) {
        Object.entries(camera.photosByYear).forEach(([year, count]) => {
          const numericYear = parseInt(year);
          yearlyCounts[numericYear] = (yearlyCounts[numericYear] || 0) + count;
        });
      }
    });
    return Object.entries(yearlyCounts)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => a.year - b.year);
  }, [visibleCameras]);

  const handleToggleExcludeCamera = (makeToToggle: string | undefined, modelToToggle: string) => {
    setCameraUsageData((prevData) =>
      prevData.map((camera) =>
        camera.make === makeToToggle && camera.model === modelToToggle
          ? { ...camera, isExcluded: !camera.isExcluded }
          : camera
      )
    );
  };

  // Conditional returns after all hooks have been called
  if (isLoadingExif) {
    return (
      <section className="space-y-4">
        {/* <h2 className="text-xl font-semibold text-gray-800">{t('usedCameras.title')}</h2> */}
        <div className="p-4 border rounded-md bg-gray-50">
          <p className="text-gray-500">{t('analysis.loading')}</p>
        </div>
      </section>
    );
  }

  // Adjusted condition: if isLoadingExif is false, and cameraUsageData is empty.
  if (cameraUsageData.length === 0) {
    return (
      <section className="space-y-4">
        {/* <h2 className="text-xl font-semibold text-gray-800">{t('usedCameras.title')}</h2> */}
        {/* <div className="p-4 border rounded-md bg-gray-50">
          <p className="text-gray-500">{t('analysis.noData')}</p>
        </div> */}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Input field for custom title */}     
      <div className="w-full max-w-4xl mx-auto flex justify-start mb-2">
        <div className="flex items-center">
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder={t('customName.placeholder')}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8884d8] focus:border-[#8884d8] mr-2"
            style={{backgroundColor: '#e7ebfe'}}
          />
        </div>
      </div>

      {/* Panel style update: ensuring translucency, centering chart, and adjusting details panel style */}
      {visibleCameras.length > 0 ? (
        <div ref={cameraChartRef} className="p-4 border border-gray-200 rounded-lg shadow-lg bg-white bg-opacity-40 backdrop-filter backdrop-blur-md mb-6 mx-auto w-full max-w-4xl flex flex-col items-center" style={{ height: `${Math.max(450, visibleCameras.length * 20 + 150)}px` }}> {/* Dynamic height based on camera count */}
          <div className="w-full flex justify-between items-center mb-4 px-2">
            <h2 className="text-2xl font-semibold text-gray-800">
              {customTitle ? `${customTitle}'s Camera History` : t('usedCameras.myCamerasTitle')}
            </h2>
            <div className="flex gap-2 items-center">
              <button 
                onClick={() => setUseMultipleColors(!useMultipleColors)}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${useMultipleColors ? 'bg-[#8884d8] hover:bg-[#706cc4] focus:ring-[#8884d8]' : 'bg-gray-400 hover:bg-gray-500 focus:ring-gray-500'}`}
              >
                {t('usedCameras.useMultipleColors')}
              </button>
              <button 
                onClick={captureChart}
                className="px-4 py-2 text-sm font-medium text-white bg-[#8884d8] hover:bg-[#706cc4] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8884d8] transition-colors"
              >
                {t('usedCameras.captureButton')}
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(370, visibleCameras.length * 20 + 70)}>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 0, // Further adjusted left margin for chart centering, YAxis width will push it right
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                domain={['dataMin', 'dataMax']} 
                tickFormatter={(unixTime) => {
                  const date = new Date(unixTime);
                  if (i18n.language === 'ko') {
                    return `'${String(date.getFullYear()).slice(-2)}. ${date.getMonth() + 1}.`;
                  }
                  return date.toLocaleDateString(i18n.language, { year: '2-digit', month: 'short' });
                }}
                tickCount={10} // Increased tick count
                tick={{ fontSize: 12 }} // Smaller font for XAxis ticks
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={180} // Adjusted width for longer names
                interval={0} 
                tick={{ fontSize: 12 }} // Smaller font for YAxis ticks
              />
              <Tooltip 
                labelFormatter={(label) => label}
                formatter={(value, name, props) => {
                  if (name === 'range' && props && props.payload) {
                    const { originalStartDate, originalEndDate } = props.payload;
                    const startDateStr = originalStartDate
                      ? new Date(originalStartDate).toLocaleDateString(i18n.language)
                      : t('common.notAvailable', 'N/A');

                    let endDateStr;
                    if (originalEndDate) {
                      endDateStr = new Date(originalEndDate).toLocaleDateString(i18n.language);
                    } else if (originalStartDate) { // Has start, but no original end date implies ongoing
                      endDateStr = t('common.present', 'Present');
                    } else {
                      endDateStr = t('common.notAvailable', 'N/A');
                    }
                    return [`${startDateStr} - ${endDateStr}`, t('usedCameras.usagePeriodSimple', 'Usage Period')];
                  }
                  // Fallback for other potential tooltips, though 'range' is primary here
                  return [Array.isArray(value) ? `${new Date(value[0]).toLocaleDateString(i18n.language)} - ${new Date(value[1]).toLocaleDateString(i18n.language)}` : String(value), name];
                }}
              />
              {/* <Legend wrapperStyle={{ fontSize: '12px' }} /> */}{/* Smaller font for Legend - Legend removed as per request */}
              <Bar dataKey="range" fill={useMultipleColors ? undefined : defaultBarColor}>
                {useMultipleColors && chartData.map((entry, index) => (
                  <Bar key={`bar-${index}`} dataKey="range" fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="p-4 border rounded-md bg-gray-50 mb-6">
          <p className="text-center text-gray-400 italic">{t('usedCameras.noDataForChart', 'No camera data available for chart.')}</p>
        </div>
      )}


      <div>
        {/* <h3 className="text-lg font-medium text-gray-700 mb-2">{t('usedCameras.detailsTitle', 'Camera Usage Details')}</h3> */}
        {visibleCameras.length > 0 ? (
          <ul className="space-y-3">
            {visibleCameras.map((camera, index) => (
              <li key={`${camera.make || ''}-${camera.model}`} className="p-3 border border-gray-200 rounded-lg shadow-md bg-white bg-opacity-40 backdrop-filter backdrop-blur-md" style={{ borderLeft: useMultipleColors ? `5px solid ${cameraColors[index % cameraColors.length]}` : `5px solid ${defaultBarColor}` }}> {/* Enhanced panel style for details items */}
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">{formatCameraName(camera.make, camera.model)}</span>
                  <button
                    onClick={() => handleToggleExcludeCamera(camera.make, camera.model)}
                    className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
                  >
                    {t('usedCameras.excludeButton', '이 카메라 제외')}
                  </button>
                </div>
                {camera.startDate && camera.endDate && (
                  <p className="text-sm text-gray-500 mt-1">
                    {t('usedCameras.usagePeriod', { startDate: camera.startDate, endDate: camera.endDate })}
                  </p>
                )}
                {camera.photoCount !== undefined && (
                  <p className="text-sm text-gray-600 mt-1">
                    {t('usedCameras.totalPhotos', 'Total Photos')}: {camera.photoCount}
                  </p>
                )}
                {camera.lensUsage && Object.keys(camera.lensUsage).length > 0 && (
                  <div className="mt-2">
                    {/* <p className="text-sm font-medium text-gray-600">{t('usedCameras.lensUsageTitle', 'Lens Photo Counts')}:</p> */}{/* Removed "Lens Photo Counts" text as per request */}
                    <ul className="list-disc list-inside ml-4 text-sm text-gray-500">
                      {camera.lensUsage.map((lensItem) => (
                        <li key={`${lensItem.make || ''}-${lensItem.model}`}>{formatCameraName(lensItem.make, lensItem.model)}: {lensItem.count} {t('usedCameras.photos', 'photos')}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">{t('usedCameras.noVisibleCameras', 'No cameras to display. Upload images or adjust exclusion settings.')}</p>
        )}
      </div>

      {excludedCameras.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-700 mb-2">{t('usedCameras.excludedCamerasTitle', 'Excluded Cameras')}</h3>
          <ul className="space-y-2">
            {excludedCameras.map((camera) => (
              <li key={`${camera.make || ''}-${camera.model}`} className="p-3 border border-gray-200 rounded-lg shadow-md bg-white bg-opacity-40 backdrop-filter backdrop-blur-md flex justify-between items-center">
                <span className="text-gray-600 italic">{formatCameraName(camera.make, camera.model)}</span>
                <button
                  onClick={() => handleToggleExcludeCamera(camera.make, camera.model)}
                  className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
                >
                  {t('usedCameras.includeButton', '이 카메라 포함')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 연도별 사진 수 선 그래프 */}
      {photosByYearForVisibleCameras.length > 0 && (
        <div ref={photoChartRef} className="mt-16 p-4 border border-gray-200 rounded-lg shadow-lg bg-white bg-opacity-40 backdrop-filter backdrop-blur-md h-[350px] mx-auto w-full max-w-4xl flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-4 px-2">
             <h3 className="text-2xl font-semibold text-gray-800">
               {customTitle ? `${customTitle}'s Photos by Year` : t('usedCameras.photosByYearTitle', 'Photos per Year')}
             </h3>
            <button 
              onClick={capturePhotoChart}
              className="px-4 py-2 text-sm font-medium text-white bg-[#8884d8] hover:bg-[#706cc4] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8884d8] transition-colors"
            >
              {t('usedCameras.captureButton')}
            </button>
          </div>
          {/* Adjusted h-[300px] to h-full or specific value if title takes space, and added flex items-center to the parent if needed */}
          <div className="w-full h-[calc(100%-2rem)] flex items-center"> {/* Adjust height considering the title */} 
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={photosByYearForVisibleCameras}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tickFormatter={(year) => `'${String(year).slice(-2)}`} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [value, t('usedCameras.photoCount', 'Photo Count')]} />
                {/* <Legend /> */}
                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <div className="text-center mt-8">
        <button
          onClick={returnToHome}
          className="underline text-sm text-gray-600"
        >
          {t('navigation.returnHome')}
        </button>
      </div>
    </section>
  );
};