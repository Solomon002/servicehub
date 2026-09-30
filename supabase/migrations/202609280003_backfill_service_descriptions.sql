update public.services
set description = case lower(name)
  when 'haircut' then 'A tailored scissor or clipper cut, finished to your preferred shape and style.'
  when 'low fade' then 'A clean low fade blended around the sides and back, finished with your preferred top length.'
  when 'haircut + beard' then 'A full haircut paired with a beard shape-up and a clean, tidy finish.'
  when 'beard trim' then 'Shape and even your beard, with clean edges and a neat finish.'
  else 'A professional ' || name || ' service, tailored to your preferred style and finish.'
end
where btrim(description) = '';
